-- =====================================================================
-- SIPORA - Step 4: order function + safety fixes
-- Run ONCE in Supabase > SQL Editor (after schema.sql and seed-products.sql).
-- =====================================================================

-- 1. The backend now handles payments. So a customer must NOT add payment rows from the browser.
--    (If this policy stays, someone could add fake rows or block a real Instapay reference.)
drop policy if exists "payments: customer adds pending" on public.payments;

-- 2. The same Instapay reference cannot be used for two orders (unless the first was rejected).
create unique index if not exists payments_instapay_ref_uq
  on public.payments (lower(instapay_reference))
  where instapay_reference is not null and status <> 'rejected';

-- 3. Create an order in ONE safe step. It reads the REAL prices from the database.
--    The browser never sends a price. Only the backend (service key) can call this.
create or replace function public.create_order(p_user uuid, p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings   public.store_settings%rowtype;
  v_profile    public.profiles%rowtype;
  v_method     public.payment_method;
  v_item       jsonb;
  v_prod       public.products%rowtype;
  v_color      public.product_colors%rowtype;
  v_size       public.product_sizes%rowtype;
  v_color_cnt  int;
  v_size_cnt   int;
  v_qty        int;
  v_unit       numeric(10,2);
  v_lines      jsonb := '[]'::jsonb;
  v_subtotal   numeric(10,2) := 0;
  v_discount   numeric(10,2) := 0;
  v_total      numeric(10,2);
  v_loyalty    boolean := false;
  v_ref        text;
  v_shot       text;
  v_order      public.orders%rowtype;
  v_payment_id uuid;
begin
  if jsonb_typeof(p -> 'items') is distinct from 'array'
     or jsonb_array_length(p -> 'items') not between 1 and 30 then
    raise exception 'sipora:BAD_ITEMS Your bag must have 1 to 30 items.';
  end if;

  v_method := (p ->> 'payment_method')::public.payment_method;
  v_ref    := nullif(btrim(p ->> 'instapay_reference'), '');
  v_shot   := nullif(btrim(p ->> 'screenshot_path'), '');

  if v_method = 'instapay' and v_ref is null and v_shot is null then
    raise exception 'sipora:PAYMENT_PROOF_REQUIRED Add your Instapay reference number or a screenshot.';
  end if;

  select * into v_settings from public.store_settings where id = 1;

  -- Lock this customer's profile, so two orders at the same time cannot both get the discount.
  select * into v_profile from public.profiles where id = p_user for update;
  if not found then
    raise exception 'sipora:NO_PROFILE Customer profile not found.';
  end if;

  -- Read every product from the database and build the order lines.
  for v_item in select * from jsonb_array_elements(p -> 'items') loop
    v_qty := (v_item ->> 'quantity')::int;
    if v_qty is null or v_qty not between 1 and 20 then
      raise exception 'sipora:BAD_QUANTITY Quantity must be from 1 to 20.';
    end if;

    select * into v_prod from public.products
      where id = (v_item ->> 'product_id')::uuid and is_active;
    if not found then
      raise exception 'sipora:PRODUCT_UNAVAILABLE One of the products is not available any more.';
    end if;

    -- color
    select count(*) into v_color_cnt from public.product_colors where product_id = v_prod.id;
    v_color := null;
    if v_color_cnt > 0 then
      if v_item ->> 'color_id' is not null then
        select * into v_color from public.product_colors
          where id = (v_item ->> 'color_id')::uuid and product_id = v_prod.id;
      elsif v_color_cnt = 1 then
        select * into v_color from public.product_colors where product_id = v_prod.id;
      end if;
      if v_color.id is null then
        raise exception 'sipora:BAD_COLOR Please choose a color for %.', v_prod.name;
      end if;
      if not v_color.in_stock then
        raise exception 'sipora:OUT_OF_STOCK % (%) is out of stock.', v_prod.name, v_color.name;
      end if;
    end if;

    -- size
    select count(*) into v_size_cnt from public.product_sizes where product_id = v_prod.id;
    v_size := null;
    if v_size_cnt > 0 then
      if v_item ->> 'size_id' is not null then
        select * into v_size from public.product_sizes
          where id = (v_item ->> 'size_id')::uuid and product_id = v_prod.id;
      end if;
      if v_size.id is null then
        raise exception 'sipora:BAD_SIZE Please choose a size for %.', v_prod.name;
      end if;
      if not v_size.in_stock then
        raise exception 'sipora:OUT_OF_STOCK % (%) is out of stock.', v_prod.name, v_size.label;
      end if;
    end if;

    v_unit     := coalesce(v_size.price_egp, v_prod.price_egp);
    v_subtotal := v_subtotal + v_unit * v_qty;
    v_lines    := v_lines || jsonb_build_object(
      'product_id',     v_prod.id,
      'product_name',   v_prod.name,
      'color_name',     v_color.name,
      'size_label',     v_size.label,
      'unit_price_egp', v_unit,
      'quantity',       v_qty);
  end loop;

  -- Loyalty: the 3rd order (or the number in store_settings) gets the discount.
  -- Only ONE open order at a time can use it.
  v_loyalty := v_settings.loyalty_discount_percent > 0
    and (v_profile.completed_orders % v_settings.loyalty_orders_required) = v_settings.loyalty_orders_required - 1
    and not exists (
      select 1 from public.orders
      where user_id = p_user and loyalty_applied and status not in ('completed', 'cancelled'));

  if v_loyalty then
    v_discount := round(v_subtotal * v_settings.loyalty_discount_percent / 100, 2);
  end if;

  v_total := v_subtotal - v_discount + v_settings.delivery_fee_egp;

  insert into public.orders (
    user_id, payment_method, subtotal_egp, discount_egp, delivery_fee_egp, total_egp, loyalty_applied,
    customer_name, customer_phone, address_text, latitude, longitude, notes)
  values (
    p_user, v_method, v_subtotal, v_discount, v_settings.delivery_fee_egp, v_total, v_loyalty,
    p ->> 'customer_name', p ->> 'customer_phone', p ->> 'address_text',
    (p ->> 'latitude')::double precision, (p ->> 'longitude')::double precision,
    nullif(p ->> 'notes', ''))
  returning * into v_order;

  insert into public.order_items (order_id, product_id, product_name, color_name, size_label, unit_price_egp, quantity)
  select v_order.id, (l ->> 'product_id')::uuid, l ->> 'product_name', l ->> 'color_name',
         l ->> 'size_label', (l ->> 'unit_price_egp')::numeric, (l ->> 'quantity')::int
  from jsonb_array_elements(v_lines) as l;

  insert into public.payments (order_id, method, status, amount_egp, instapay_reference, screenshot_path)
  values (v_order.id, v_method, 'pending', v_total, v_ref, v_shot)
  returning id into v_payment_id;

  return jsonb_build_object(
    'id',               v_order.id,
    'order_number',     v_order.order_number,
    'payment_id',       v_payment_id,
    'payment_method',   v_method,
    'subtotal_egp',     v_subtotal,
    'discount_egp',     v_discount,
    'delivery_fee_egp', v_settings.delivery_fee_egp,
    'total_egp',        v_total,
    'loyalty_applied',  v_loyalty,
    'items',            v_lines);
end;
$$;

-- Only the backend (service key) may call it. Visitors and customers may not.
revoke all on function public.create_order(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.create_order(uuid, jsonb) to service_role;

-- Tell the API to reload its list of functions (Supabase usually does this by itself).
notify pgrst, 'reload schema';
