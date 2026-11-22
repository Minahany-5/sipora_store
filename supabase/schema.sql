-- =====================================================================
-- SIPORA - Step 2: database
-- Run this ONCE in Supabase > SQL Editor on a fresh project.
-- =====================================================================

-- ---------- 1. Types ----------
create type public.app_role as enum ('admin', 'staff', 'customer');
create type public.order_status as enum
  ('pending', 'confirmed', 'preparing', 'out_for_delivery', 'completed', 'cancelled');
create type public.payment_method as enum ('instapay', 'cod');
create type public.payment_status as enum ('pending', 'approved', 'rejected');

-- ---------- 2. Small helper: updated_at ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- 3. Profiles (one row per user) ----------
create table public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  full_name        text,
  phone            text,
  role             public.app_role not null default 'customer',
  completed_orders integer not null default 0 check (completed_orders >= 0),
  language         text not null default 'en',
  theme            text not null default 'light' check (theme in ('light', 'dark')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile automatically when someone signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role helpers (security definer = they skip RLS, so no loops)
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'staff')
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Only an admin can change a role
create or replace function public.admin_set_role(target uuid, new_role public.app_role)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can change roles';
  end if;
  update public.profiles set role = new_role where id = target;
end;
$$;

-- ---------- 4. Store settings (one row) ----------
create table public.store_settings (
  id                      integer primary key default 1 check (id = 1),
  loyalty_orders_required integer not null default 3 check (loyalty_orders_required >= 2),
  loyalty_discount_percent numeric(5,2) not null default 0 check (loyalty_discount_percent between 0 and 100),
  delivery_fee_egp        numeric(10,2) not null default 0 check (delivery_fee_egp >= 0),
  instapay_handle         text,
  whatsapp_number         text not null default '+201210033628',
  updated_at              timestamptz not null default now()
);
insert into public.store_settings (id) values (1);
create trigger store_settings_updated_at before update on public.store_settings
  for each row execute function public.set_updated_at();

-- ---------- 5. Products ----------
create table public.products (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  category    text,
  price_egp   numeric(10,2) not null check (price_egp >= 0),
  compare_at_price_egp numeric(10,2) check (compare_at_price_egp >= 0), -- old price, shown crossed out
  is_active   boolean not null default true,
  is_featured boolean not null default false,
  is_new      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create index products_active_idx on public.products (is_active, created_at desc);

create table public.product_colors (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name       text not null,
  hex        text not null check (hex ~ '^#[0-9A-Fa-f]{6}$'),
  in_stock   boolean not null default true,
  sort_order integer not null default 0
);
create index product_colors_product_idx on public.product_colors (product_id);

create table public.product_sizes (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  label      text not null,                         -- example: '24 oz'
  price_egp  numeric(10,2) check (price_egp >= 0), -- empty = use the product price
  in_stock   boolean not null default true,
  sort_order integer not null default 0
);
create index product_sizes_product_idx on public.product_sizes (product_id);

create table public.product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  color_id   uuid references public.product_colors (id) on delete set null,
  path       text not null,                         -- path inside the 'product-images' bucket
  alt        text,
  sort_order integer not null default 0
);
create index product_images_product_idx on public.product_images (product_id);

-- ---------- 6. Addresses ----------
create table public.addresses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  label        text not null default 'Home',
  full_address text not null,
  latitude     double precision,
  longitude    double precision,
  phone        text,
  is_default   boolean not null default false,
  created_at   timestamptz not null default now()
);
create index addresses_user_idx on public.addresses (user_id);

-- ---------- 7. Cart ----------
create table public.carts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references public.profiles (id) on delete cascade,
  updated_at timestamptz not null default now()
);

create table public.cart_items (
  id         uuid primary key default gen_random_uuid(),
  cart_id    uuid not null references public.carts (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  color_id   uuid references public.product_colors (id) on delete set null,
  size_id    uuid references public.product_sizes (id) on delete set null,
  quantity   integer not null default 1 check (quantity between 1 and 20),
  created_at timestamptz not null default now()
);
create index cart_items_cart_idx on public.cart_items (cart_id);

-- ---------- 8. Orders ----------
create table public.orders (
  id                uuid primary key default gen_random_uuid(),
  order_number      bigint generated always as identity (start with 1001),
  user_id           uuid not null references public.profiles (id),
  status            public.order_status not null default 'pending',
  payment_method    public.payment_method not null,
  subtotal_egp      numeric(10,2) not null check (subtotal_egp >= 0),
  discount_egp      numeric(10,2) not null default 0 check (discount_egp >= 0),
  delivery_fee_egp  numeric(10,2) not null default 0 check (delivery_fee_egp >= 0),
  total_egp         numeric(10,2) not null check (total_egp >= 0),
  loyalty_applied   boolean not null default false,
  -- a copy of the address, so old orders do not change if the customer edits an address
  customer_name     text not null,
  customer_phone    text not null,
  address_text      text not null,
  latitude          double precision,
  longitude         double precision,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  completed_at      timestamptz
);
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
create index orders_user_idx on public.orders (user_id, created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);

create table public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete cascade,
  product_id    uuid references public.products (id) on delete set null,
  product_name  text not null,
  color_name    text,
  size_label    text,
  unit_price_egp numeric(10,2) not null check (unit_price_egp >= 0),
  quantity      integer not null check (quantity > 0)
);
create index order_items_order_idx on public.order_items (order_id);

-- ---------- 9. Payments (Instapay is approved by hand) ----------
create table public.payments (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references public.orders (id) on delete cascade,
  method            public.payment_method not null,
  status            public.payment_status not null default 'pending',
  amount_egp        numeric(10,2) not null check (amount_egp >= 0),
  instapay_reference text,
  screenshot_path   text,                           -- path inside the 'payment-screenshots' bucket
  reviewed_by       uuid references public.profiles (id),
  reviewed_at       timestamptz,
  admin_note        text,
  created_at        timestamptz not null default now()
);
create index payments_order_idx on public.payments (order_id);
create index payments_status_idx on public.payments (status);

-- ---------- 10. Loyalty ----------
-- When an order becomes 'completed', add 1 to the customer's count (one time only).
create or replace function public.handle_order_completed()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    new.completed_at = now();
    update public.profiles
      set completed_orders = completed_orders + 1
      where id = new.user_id;
  end if;
  return new;
end;
$$;
create trigger orders_completed before update of status on public.orders
  for each row execute function public.handle_order_completed();

-- The app calls this to fill the "Order 1 of 3" card.
create or replace function public.my_loyalty()
returns table (completed_orders integer, orders_required integer,
               current_step integer, discount_ready boolean, discount_percent numeric)
language sql stable security definer set search_path = '' as $$
  select p.completed_orders,
         s.loyalty_orders_required,
         (p.completed_orders % s.loyalty_orders_required) + 1,
         (p.completed_orders % s.loyalty_orders_required) = s.loyalty_orders_required - 1,
         s.loyalty_discount_percent
  from public.profiles p, public.store_settings s
  where p.id = auth.uid();
$$;

-- ---------- 11. Reviews ----------
create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  rating      integer not null check (rating between 1 and 5),
  comment     text,
  is_approved boolean not null default false,       -- you approve reviews first
  created_at  timestamptz not null default now(),
  unique (product_id, user_id)
);
create index reviews_product_idx on public.reviews (product_id, is_approved);

-- ---------- 12. Blog and contact form ----------
create table public.blog_posts (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null,
  excerpt      text,
  content      text not null,
  cover_path   text,                                -- path inside the 'blog-images' bucket
  is_published boolean not null default false,
  author_id    uuid references public.profiles (id) on delete set null,
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger blog_posts_updated_at before update on public.blog_posts
  for each row execute function public.set_updated_at();

create table public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  message    text not null check (char_length(message) <= 2000),
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS)
-- Rule: turn it ON for every table. Then allow only what is needed.
-- The Node backend (Step 4) uses the service key, which skips RLS.
-- =====================================================================
alter table public.profiles         enable row level security;
alter table public.store_settings   enable row level security;
alter table public.products         enable row level security;
alter table public.product_colors   enable row level security;
alter table public.product_sizes    enable row level security;
alter table public.product_images   enable row level security;
alter table public.addresses        enable row level security;
alter table public.carts            enable row level security;
alter table public.cart_items       enable row level security;
alter table public.orders           enable row level security;
alter table public.order_items      enable row level security;
alter table public.payments         enable row level security;
alter table public.reviews          enable row level security;
alter table public.blog_posts       enable row level security;
alter table public.contact_messages enable row level security;

-- ----- profiles -----
-- A customer can edit ONLY these columns. Not role. Not completed_orders.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name, phone, language, theme) on public.profiles to authenticated;

create policy "profiles: read own or staff" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_staff());
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ----- store_settings -----
create policy "settings: everyone can read" on public.store_settings
  for select to anon, authenticated using (true);
create policy "settings: admin can change" on public.store_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ----- products, colors, sizes, images -----
create policy "products: public read active" on public.products
  for select to anon, authenticated using (is_active or public.is_staff());
create policy "products: staff write" on public.products
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "colors: public read" on public.product_colors
  for select to anon, authenticated using (true);
create policy "colors: staff write" on public.product_colors
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "sizes: public read" on public.product_sizes
  for select to anon, authenticated using (true);
create policy "sizes: staff write" on public.product_sizes
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "images: public read" on public.product_images
  for select to anon, authenticated using (true);
create policy "images: staff write" on public.product_images
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ----- addresses -----
create policy "addresses: own" on public.addresses
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "addresses: staff read" on public.addresses
  for select to authenticated using (public.is_staff());

-- ----- carts -----
create policy "carts: own" on public.carts
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "cart_items: own" on public.cart_items
  for all to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));

-- ----- orders -----
-- Customers can only READ their orders. The backend creates them
-- (so nobody can send a fake price from the browser).
create policy "orders: read own or staff" on public.orders
  for select to authenticated using (user_id = auth.uid() or public.is_staff());
create policy "orders: staff update" on public.orders
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "order_items: read own or staff" on public.order_items
  for select to authenticated
  using (public.is_staff() or exists (
    select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

-- ----- payments -----
create policy "payments: read own or staff" on public.payments
  for select to authenticated
  using (public.is_staff() or exists (
    select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
-- The customer can add a pending payment for his own order (reference / screenshot)
create policy "payments: customer adds pending" on public.payments
  for insert to authenticated
  with check (
    status = 'pending'
    and exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "payments: staff update" on public.payments
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

-- ----- reviews -----
create policy "reviews: read approved, own, or staff" on public.reviews
  for select to anon, authenticated
  using (is_approved or user_id = auth.uid() or public.is_staff());
create policy "reviews: add own (not approved)" on public.reviews
  for insert to authenticated
  with check (user_id = auth.uid() and is_approved = false);
create policy "reviews: staff manage" on public.reviews
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "reviews: delete own" on public.reviews
  for delete to authenticated using (user_id = auth.uid());

-- ----- blog -----
create policy "blog: public read published" on public.blog_posts
  for select to anon, authenticated using (is_published or public.is_staff());
create policy "blog: staff write" on public.blog_posts
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ----- contact form -----
create policy "contact: anyone can send" on public.contact_messages
  for insert to anon, authenticated with check (true);
create policy "contact: staff read" on public.contact_messages
  for select to authenticated using (public.is_staff());
create policy "contact: staff update" on public.contact_messages
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

-- =====================================================================
-- STORAGE BUCKETS
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('product-images',      'product-images',      true,  5242880, array['image/jpeg','image/png','image/webp']),
  ('blog-images',         'blog-images',         true,  5242880, array['image/jpeg','image/png','image/webp']),
  ('payment-screenshots', 'payment-screenshots', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Product and blog images: everyone can see, only staff can upload/change
create policy "storage: public read images" on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('product-images', 'blog-images'));
create policy "storage: staff write images" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('product-images', 'blog-images') and public.is_staff());
create policy "storage: staff update images" on storage.objects
  for update to authenticated
  using (bucket_id in ('product-images', 'blog-images') and public.is_staff());
create policy "storage: staff delete images" on storage.objects
  for delete to authenticated
  using (bucket_id in ('product-images', 'blog-images') and public.is_staff());

-- Payment screenshots: private. A customer uses his own folder: <user_id>/<file>
create policy "storage: customer uploads own screenshot" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'payment-screenshots'
              and (storage.foldername(name))[1] = auth.uid()::text);
create policy "storage: read own screenshot or staff" on storage.objects
  for select to authenticated
  using (bucket_id = 'payment-screenshots'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff()));
