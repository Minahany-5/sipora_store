-- Run this AFTER you create your own account on the site (or in Supabase > Authentication > Users > Add user).
-- It makes this email the admin.
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'minahany455@gmail.com');

-- Check it worked (you should see role = admin):
select id, full_name, role from public.profiles;

-- Later, set your store numbers here (these are NOT filled by me, you decide):
-- update public.store_settings
-- set loyalty_discount_percent = 0,   -- <- your discount percent for the 3rd order
--     delivery_fee_egp = 0,           -- <- your delivery price in EGP
--     instapay_handle = null;         -- <- your Instapay address
