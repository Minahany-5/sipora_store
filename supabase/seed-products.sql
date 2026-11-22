-- =====================================================================
-- SIPORA - Step 2b: your real settings and 6 products
-- Run AFTER schema.sql. Run it only once.
-- =====================================================================

-- A. Old price (the "instead of 1350" price) needs a column
alter table public.products
  add column if not exists compare_at_price_egp numeric(10,2) check (compare_at_price_egp >= 0);

-- B. Store settings
update public.store_settings
set loyalty_discount_percent = 25,
    delivery_fee_egp         = 80,
    instapay_handle          = '01210033628'
where id = 1;

-- C. Products: each COLOR is its own product (your choice)
insert into public.products (slug, name, description, category, price_egp, compare_at_price_egp, is_featured, is_new)
values
  ('owala-freesip-sage-green',     'Owala FreeSip - Sage Green',     'Insulated stainless steel bottle with the FreeSip spout. Sip or swig.', 'FreeSip', 850, 1350, true,  true),
  ('owala-freesip-hot-pink',       'Owala FreeSip - Hot Pink',       'Insulated stainless steel bottle with the FreeSip spout. Sip or swig.', 'FreeSip', 850, 1350, true,  true),
  ('owala-freesip-charcoal-black', 'Owala FreeSip - Charcoal Black', 'Insulated stainless steel bottle with the FreeSip spout. Sip or swig.', 'FreeSip', 850, 1350, false, true),
  ('owala-freesip-golden-ghosts',  'Owala FreeSip - Golden Ghosts',  'Insulated stainless steel bottle with the FreeSip spout. Sip or swig.', 'FreeSip', 850, 1350, false, true),
  ('owala-freesip-pink-bows',      'Owala FreeSip - Pink Bows',      'Insulated stainless steel bottle with the FreeSip spout. Sip or swig.', 'FreeSip', 850, 1350, true,  true),
  ('owala-freesip-blue-toile',     'Owala FreeSip - Blue Toile',     'Insulated stainless steel bottle with the FreeSip spout. Sip or swig.', 'FreeSip', 850, 1350, false, true);

-- D. One color dot for each product (the dot color is the main color of the bottle)
insert into public.product_colors (product_id, name, hex)
select p.id, c.name, c.hex
from public.products p
join (values
  ('owala-freesip-sage-green',     'Sage Green',     '#547D79'),
  ('owala-freesip-hot-pink',       'Hot Pink',       '#C4006B'),
  ('owala-freesip-charcoal-black', 'Charcoal Black', '#3E3A35'),
  ('owala-freesip-golden-ghosts',  'Golden Ghosts',  '#E9C766'),
  ('owala-freesip-pink-bows',      'Pink Bows',      '#F2B5B0'),
  ('owala-freesip-blue-toile',     'Blue Toile',     '#A9C4DC')
) as c(slug, name, hex) on c.slug = p.slug;

-- E. Two sizes for every product (same price for now)
insert into public.product_sizes (product_id, label, sort_order)
select p.id, s.label, s.sort_order
from public.products p
cross join (values ('710 ml', 1), ('900 ml', 2)) as s(label, sort_order);

-- F. Photo of each product (upload the PNG files to the 'product-images' bucket first,
--    with the same file names)
insert into public.product_images (product_id, path, alt, sort_order)
select p.id, i.path, p.name, 0
from public.products p
join (values
  ('owala-freesip-sage-green',     'sage-green.png'),
  ('owala-freesip-hot-pink',       'hot-pink.png'),
  ('owala-freesip-charcoal-black', 'charcoal-black.png'),
  ('owala-freesip-golden-ghosts',  'golden-ghosts.png'),
  ('owala-freesip-pink-bows',      'pink-bows.png'),
  ('owala-freesip-blue-toile',     'blue-toile.png')
) as i(slug, path) on i.slug = p.slug;

-- Check: you should see 6 products, each with 1 color, 2 sizes, 1 image
select p.name, p.price_egp, p.compare_at_price_egp,
       (select count(*) from public.product_colors c where c.product_id = p.id) as colors,
       (select count(*) from public.product_sizes  s where s.product_id = p.id) as sizes,
       (select count(*) from public.product_images i where i.product_id = p.id) as images
from public.products p order by p.created_at;
