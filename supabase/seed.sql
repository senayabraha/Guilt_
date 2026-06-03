-- Zembil Market — Addis Ababa demo seed data.
--
-- Auth users cannot be created from SQL on hosted Supabase, and stores/products
-- reference a profile owner. So this seed attaches several demo APPROVED stores
-- (with products) to the FIRST existing profile and promotes them to VENDOR.
--
-- Prices are in Ethiopian Birr (ETB), stored as plain numbers. Some products
-- have an original_price greater than price so they show up under "Today's deals".
--
-- Usage: register at least one user through the app first, then run this file
-- in the Supabase SQL editor. Re-running is safe — demo stores are recreated.

do $$
declare
  owner_id uuid;
  bole_id uuid;
  kazanchis_id uuid;
  megenagna_id uuid;
  cmc_id uuid;
  piassa_id uuid;
  sarbet_id uuid;
  demo_names text[] := array[
    'Bole Fresh Market', 'Kazanchis Grocery', 'Megenagna Mini Market',
    'CMC Family Store', 'Piassa Essentials', 'Sarbet Fresh Basket'
  ];
begin
  select id into owner_id from public.profiles order by created_at limit 1;

  if owner_id is null then
    raise notice 'No profiles found. Register a user in the app, then re-run seed.sql.';
    return;
  end if;

  update public.profiles set role = 'VENDOR' where id = owner_id;

  -- Make re-runs safe: remove previously seeded demo stores (products cascade).
  delete from public.stores
   where owner_id = owner_id and name = any(demo_names);

  -- Stores --------------------------------------------------------------------
  insert into public.stores (
    owner_id, name, description, phone, email, logo, cover_image,
    address, city, state, zip, categories, status, is_open,
    delivery_radius, delivery_fee, min_order
  ) values
    (owner_id, 'Bole Fresh Market',
     'Fresh produce and everyday essentials in the heart of Bole.',
     '+251 91 100 1001', 'hello@bolefresh.example',
     'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200',
     'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1200',
     'Bole Medhanialem', 'Addis Ababa', 'Bole', '1000',
     array['fruits-vegetables', 'dairy-eggs', 'bakery'], 'APPROVED', true,
     8, 60, 200)
    returning id into bole_id;

  insert into public.stores (
    owner_id, name, description, phone, email, logo, cover_image,
    address, city, state, zip, categories, status, is_open,
    delivery_radius, delivery_fee, min_order
  ) values
    (owner_id, 'Kazanchis Grocery',
     'Your neighborhood grocery for pantry staples and drinks.',
     '+251 91 100 1002', 'hello@kazanchisgrocery.example',
     'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=200',
     'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=1200',
     'Kazanchis', 'Addis Ababa', 'Kirkos', '1000',
     array['pantry-staples', 'beverages', 'snacks'], 'APPROVED', true,
     6, 70, 250)
    returning id into kazanchis_id;

  insert into public.stores (
    owner_id, name, description, phone, email, logo, cover_image,
    address, city, state, zip, categories, status, is_open,
    delivery_radius, delivery_fee, min_order
  ) values
    (owner_id, 'Megenagna Mini Market',
     'Local store with coffee, spices, and household essentials.',
     '+251 91 100 1003', 'hello@megenagnamini.example',
     'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=200',
     'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1200',
     'Megenagna', 'Addis Ababa', 'Yeka', '1000',
     array['coffee-spices', 'household-essentials', 'pantry-staples'], 'APPROVED', true,
     7, 65, 200)
    returning id into megenagna_id;

  insert into public.stores (
    owner_id, name, description, phone, email, logo, cover_image,
    address, city, state, zip, categories, status, is_open,
    delivery_radius, delivery_fee, min_order
  ) values
    (owner_id, 'CMC Family Store',
     'Family groceries, baby care, and daily needs around CMC.',
     '+251 91 100 1004', 'hello@cmcfamily.example',
     'https://images.unsplash.com/photo-1601599963565-b7ba29c8d4b5?w=200',
     'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200',
     'CMC Road', 'Addis Ababa', 'Bole', '1000',
     array['baby-care', 'dairy-eggs', 'household-essentials'], 'APPROVED', true,
     9, 80, 300)
    returning id into cmc_id;

  insert into public.stores (
    owner_id, name, description, phone, email, logo, cover_image,
    address, city, state, zip, categories, status, is_open,
    delivery_radius, delivery_fee, min_order
  ) values
    (owner_id, 'Piassa Essentials',
     'Classic Piassa shop for injera, local foods, and staples.',
     '+251 91 100 1005', 'hello@piassaessentials.example',
     'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=200',
     'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1200',
     'Piassa', 'Addis Ababa', 'Arada', '1000',
     array['injera-local-foods', 'pantry-staples', 'bakery'], 'APPROVED', true,
     5, 55, 150)
    returning id into piassa_id;

  insert into public.stores (
    owner_id, name, description, phone, email, logo, cover_image,
    address, city, state, zip, categories, status, is_open,
    delivery_radius, delivery_fee, min_order
  ) values
    (owner_id, 'Sarbet Fresh Basket',
     'Fresh fruits, vegetables, and meat delivered around Sarbet.',
     '+251 91 100 1006', 'hello@sarbetfresh.example',
     'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=200',
     'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=1200',
     'Sarbet', 'Addis Ababa', 'Nifas Silk-Lafto', '1000',
     array['fruits-vegetables', 'meat-seafood', 'dairy-eggs'], 'APPROVED', true,
     7, 75, 250)
    returning id into sarbet_id;

  -- Products (prices in ETB; some with original_price > price for deals) -------
  insert into public.products
    (store_id, name, description, price, original_price, image, category, unit, stock, is_organic, is_active)
  values
    -- Bole Fresh Market
    (bole_id, 'Fresh Tomatoes', 'Ripe red tomatoes', 60, 80, 'https://images.unsplash.com/photo-1546470427-e26264be0b0d?w=400', 'fruits-vegetables', 'kg', 120, true, true),
    (bole_id, 'Bananas', 'Sweet ripe bananas', 50, 65, 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400', 'fruits-vegetables', 'kg', 100, false, true),
    (bole_id, 'Milk 1L', 'Fresh whole milk', 65, 0, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400', 'dairy-eggs', '1L', 60, false, true),
    (bole_id, 'Bread', 'Soft fresh bread loaf', 35, 0, 'https://images.unsplash.com/photo-1585478259715-19c8a1f1f0f1?w=400', 'bakery', 'loaf', 40, false, true),
    -- Kazanchis Grocery
    (kazanchis_id, 'Teff Flour 5kg', 'Premium white teff flour', 650, 750, 'https://images.unsplash.com/photo-1568254183919-78a4f43a2877?w=400', 'pantry-staples', '5kg', 50, false, true),
    (kazanchis_id, 'Bottled Water 1L', 'Purified drinking water', 25, 0, 'https://images.unsplash.com/photo-1560023907-5f339617ea30?w=400', 'beverages', '1L', 200, false, true),
    (kazanchis_id, 'Cooking Oil 5L', 'Sunflower cooking oil', 720, 820, 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400', 'pantry-staples', '5L', 35, false, true),
    -- Megenagna Mini Market
    (megenagna_id, 'Ethiopian Coffee 500g', 'Roasted Yirgacheffe beans', 420, 500, 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400', 'coffee-spices', '500g', 80, false, true),
    (megenagna_id, 'Berbere Spice 250g', 'Traditional berbere blend', 180, 220, 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400', 'coffee-spices', '250g', 70, false, true),
    (megenagna_id, 'Laundry Soap', 'Multipurpose laundry soap', 90, 110, 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=400', 'household-essentials', 'pack', 90, false, true),
    -- CMC Family Store
    (cmc_id, 'Eggs (12)', 'Dozen fresh eggs', 140, 160, 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400', 'dairy-eggs', 'dozen', 60, false, true),
    (cmc_id, 'Baby Wipes', 'Gentle baby wipes', 220, 260, 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400', 'baby-care', 'pack', 50, false, true),
    (cmc_id, 'Greek Yogurt', 'Plain yogurt cup', 70, 0, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400', 'dairy-eggs', 'cup', 80, false, true),
    -- Piassa Essentials
    (piassa_id, 'Injera Pack (10)', 'Fresh injera, pack of 10', 120, 0, 'https://images.unsplash.com/photo-1591299177061-2151e53fcaea?w=400', 'injera-local-foods', 'pack', 60, false, true),
    (piassa_id, 'Shiro Powder 1kg', 'Spiced chickpea shiro', 240, 280, 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400', 'injera-local-foods', '1kg', 45, false, true),
    -- Sarbet Fresh Basket
    (sarbet_id, 'Avocados', 'Creamy ripe avocados', 90, 120, 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400', 'fruits-vegetables', 'kg', 80, true, true),
    (sarbet_id, 'Beef 1kg', 'Fresh local beef', 650, 720, 'https://images.unsplash.com/photo-1603048719537-2b2b7e0b3a9a?w=400', 'meat-seafood', 'kg', 30, false, true),
    (sarbet_id, 'Onions', 'Fresh red onions', 55, 70, 'https://images.unsplash.com/photo-1518977956812-cd3dbadaaf31?w=400', 'fruits-vegetables', 'kg', 110, false, true);

  raise notice 'Seeded 6 Addis Ababa demo stores for profile %.', owner_id;
end $$;
