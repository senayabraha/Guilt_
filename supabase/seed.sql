-- Guilt_ marketplace — demo seed data.
--
-- Auth users cannot be created from SQL on hosted Supabase, and stores/products
-- reference a profile owner. So this seed attaches a demo approved store (plus
-- 8 products) to the FIRST existing profile and promotes them to VENDOR.
--
-- Usage: register at least one user through the app first, then run this file
-- in the Supabase SQL editor.

do $$
declare
  owner_id uuid;
  store_id uuid;
begin
  select id into owner_id from public.profiles order by created_at limit 1;

  if owner_id is null then
    raise notice 'No profiles found. Register a user in the app, then re-run seed.sql.';
    return;
  end if;

  update public.profiles set role = 'VENDOR' where id = owner_id;

  insert into public.stores (
    owner_id, name, description, phone, email, logo, cover_image,
    address, city, state, zip, categories, status, is_open,
    delivery_radius, delivery_fee, min_order
  ) values (
    owner_id,
    'Green Valley Market',
    'Fresh organic groceries from local farms.',
    '+1 555-0100',
    'hello@greenvalley.example',
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200',
    'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1200',
    '123 Market Street', 'Springfield', 'IL', '62701',
    array['fruits-vegetables', 'dairy-eggs', 'bakery'],
    'APPROVED', true, 8, 1.99, 10
  )
  returning id into store_id;

  insert into public.products
    (store_id, name, description, price, original_price, image, category, unit, stock, is_organic, is_active)
  values
    (store_id, 'Organic Bananas', 'Sweet ripe bananas', 1.49, 1.99, 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400', 'fruits-vegetables', 'lb', 120, true, true),
    (store_id, 'Fresh Strawberries', 'Locally grown strawberries', 3.99, 4.99, 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400', 'fruits-vegetables', 'box', 60, true, true),
    (store_id, 'Whole Milk', 'Farm fresh whole milk', 2.49, 0, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400', 'dairy-eggs', 'gallon', 40, false, true),
    (store_id, 'Free-Range Eggs', 'Dozen large brown eggs', 4.29, 4.99, 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400', 'dairy-eggs', 'dozen', 50, true, true),
    (store_id, 'Sourdough Bread', 'Artisan sourdough loaf', 5.49, 0, 'https://images.unsplash.com/photo-1585478259715-19c8a1f1f0f1?w=400', 'bakery', 'loaf', 30, false, true),
    (store_id, 'Avocados', 'Creamy Hass avocados', 1.99, 2.49, 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400', 'fruits-vegetables', 'each', 80, true, true),
    (store_id, 'Greek Yogurt', 'Plain Greek yogurt', 1.29, 0, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400', 'dairy-eggs', 'cup', 90, false, true),
    (store_id, 'Croissants', 'Buttery French croissants', 6.99, 7.99, 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400', 'bakery', 'pack', 25, false, true);

  raise notice 'Seeded store % owned by profile %.', store_id, owner_id;
end $$;
