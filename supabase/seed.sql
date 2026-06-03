-- Zembil Market — Addis Ababa demo seed data (dedicated demo vendor account).
--
-- All demo stores and products are created under ONE specific vendor profile,
-- identified by email. Auth users cannot be created from SQL on hosted Supabase,
-- so that account must exist first.
--
-- How to use:
--   1. First register/login with the vendor email in the app:
--        welde.senu@gmail.com
--   2. Then run this file (supabase/seed.sql) in the Supabase SQL Editor.
--   3. The script creates 6 demo stores and 18 products per store.
--   4. Total expected product count: 108 products (6 stores × 18 products).
--   5. Re-running is safe; it recreates only those demo stores for that vendor
--      (existing products cascade-delete with the stores).
--
-- Prices are in Ethiopian Birr (ETB), stored as plain numbers. Some products
-- have an original_price greater than price so they show up as discounts.

do $$
declare
  demo_vendor_email text := 'welde.senu@gmail.com';
  demo_owner_id uuid;
  new_store_id uuid;
  i int;
  j int;

  -- Store definitions (parallel arrays, index 1..6) ---------------------------
  store_keys   text[] := array[
    'bole', 'kazanchis', 'megenagna', 'cmc', 'piassa', 'sarbet'
  ];
  store_names  text[] := array[
    'Bole Fresh Market', 'Kazanchis Grocery', 'Megenagna Mini Market',
    'CMC Family Store', 'Piassa Essentials', 'Sarbet Fresh Basket'
  ];
  store_descs  text[] := array[
    'Fresh produce and everyday essentials in the heart of Bole.',
    'Your neighborhood grocery for pantry staples and drinks.',
    'Local store with coffee, spices, and household essentials.',
    'Family groceries, baby care, and daily needs around CMC.',
    'Classic Piassa shop for injera, local foods, and staples.',
    'Fresh fruits, vegetables, and meat delivered around Sarbet.'
  ];
  store_phones text[] := array[
    '+251 91 100 1001', '+251 91 100 1002', '+251 91 100 1003',
    '+251 91 100 1004', '+251 91 100 1005', '+251 91 100 1006'
  ];
  store_emails text[] := array[
    'hello@bolefresh.example', 'hello@kazanchisgrocery.example',
    'hello@megenagnamini.example', 'hello@cmcfamily.example',
    'hello@piassaessentials.example', 'hello@sarbetfresh.example'
  ];
  store_addrs  text[] := array[
    'Bole Medhanialem', 'Kazanchis', 'Megenagna', 'CMC Road', 'Piassa', 'Sarbet'
  ];
  store_areas  text[] := array[
    'Bole', 'Kirkos', 'Yeka', 'Bole', 'Arada', 'Nifas Silk-Lafto'
  ];
  -- Comma-separated category slugs per store (expanded with string_to_array).
  store_cats   text[] := array[
    'fruits-vegetables,dairy-eggs,bakery',
    'pantry-staples,beverages,snacks',
    'coffee-spices,household-essentials,pantry-staples',
    'baby-care,dairy-eggs,household-essentials',
    'injera-local-foods,pantry-staples,bakery',
    'fruits-vegetables,meat-seafood,dairy-eggs'
  ];
  store_radius int[]     := array[8, 6, 7, 9, 5, 7];
  store_fee    numeric[] := array[60, 70, 65, 80, 55, 75];
  store_min    numeric[] := array[200, 250, 200, 300, 150, 250];

  -- Product catalog (parallel arrays, index 1..18). Every store gets all 18. --
  prod_keys  text[] := array[
    'tomatoes', 'bananas', 'milk', 'bread', 'teff-flour', 'water',
    'cooking-oil', 'coffee', 'berbere', 'laundry-soap', 'eggs', 'baby-wipes',
    'yogurt', 'injera', 'shiro', 'avocados', 'beef', 'onions'
  ];
  prod_names text[] := array[
    'Fresh Tomatoes', 'Bananas', 'Milk 1L', 'Bread', 'Teff Flour 5kg',
    'Bottled Water 1L', 'Cooking Oil 5L', 'Ethiopian Coffee 500g',
    'Berbere Spice 250g', 'Laundry Soap', 'Eggs (12)', 'Baby Wipes',
    'Greek Yogurt', 'Injera Pack (10)', 'Shiro Powder 1kg', 'Avocados',
    'Beef 1kg', 'Onions'
  ];
  prod_descs text[] := array[
    'Ripe red tomatoes', 'Sweet ripe bananas', 'Fresh whole milk',
    'Soft fresh bread loaf', 'Premium white teff flour',
    'Purified drinking water', 'Sunflower cooking oil',
    'Roasted Yirgacheffe beans', 'Traditional berbere blend',
    'Multipurpose laundry soap', 'Dozen fresh eggs', 'Gentle baby wipes',
    'Plain yogurt cup', 'Fresh injera, pack of 10', 'Spiced chickpea shiro',
    'Creamy ripe avocados', 'Fresh local beef', 'Fresh red onions'
  ];
  prod_price numeric[] := array[
    60, 50, 65, 35, 650, 25, 720, 420, 180, 90, 140, 220, 70, 120, 240, 90, 650, 55
  ];
  -- 0 means "no discount" (no strikethrough original price).
  prod_orig  numeric[] := array[
    80, 65, 0, 0, 750, 0, 820, 500, 220, 110, 160, 260, 0, 0, 280, 120, 720, 70
  ];
  prod_cats  text[] := array[
    'fruits-vegetables', 'fruits-vegetables', 'dairy-eggs', 'bakery',
    'pantry-staples', 'beverages', 'pantry-staples', 'coffee-spices',
    'coffee-spices', 'household-essentials', 'dairy-eggs', 'baby-care',
    'dairy-eggs', 'injera-local-foods', 'injera-local-foods',
    'fruits-vegetables', 'meat-seafood', 'fruits-vegetables'
  ];
  prod_units text[] := array[
    'kg', 'kg', '1L', 'loaf', '5kg', '1L', '5L', '500g', '250g', 'pack',
    'dozen', 'pack', 'cup', 'pack', '1kg', 'kg', 'kg', 'kg'
  ];
  prod_stock int[] := array[
    120, 100, 60, 40, 50, 200, 35, 80, 70, 90, 60, 50, 80, 60, 45, 80, 30, 110
  ];
  prod_org boolean[] := array[
    true, false, false, false, false, false, false, false, false, false,
    false, false, false, false, false, true, false, false
  ];
begin
  -- Target ONLY the dedicated demo vendor account (never the first profile).
  select id into demo_owner_id
  from public.profiles
  where email = demo_vendor_email
  limit 1;

  if demo_owner_id is null then
    raise exception 'No profile found for welde.senu@gmail.com. Create this vendor account through the app first, then re-run seed.sql.';
  end if;

  -- Promote to VENDOR if needed.
  update public.profiles set role = 'VENDOR' where id = demo_owner_id;

  -- Re-run safe: remove only this vendor's demo stores (products cascade).
  delete from public.stores
  where public.stores.owner_id = demo_owner_id
    and public.stores.name = any(store_names);

  -- Create each store, then all 18 products under it.
  for i in 1 .. array_length(store_keys, 1) loop
    insert into public.stores (
      owner_id, name, description, phone, email, logo, cover_image,
      address, city, state, zip, categories, status, is_open,
      delivery_radius, delivery_fee, min_order
    ) values (
      demo_owner_id,
      store_names[i],
      store_descs[i],
      store_phones[i],
      store_emails[i],
      'https://picsum.photos/seed/zembil-' || store_keys[i] || '-logo/400/400',
      'https://picsum.photos/seed/zembil-' || store_keys[i] || '-cover/1400/600',
      store_addrs[i],
      'Addis Ababa',
      store_areas[i],
      '1000',
      string_to_array(store_cats[i], ','),
      'APPROVED',
      true,
      store_radius[i],
      store_fee[i],
      store_min[i]
    )
    returning id into new_store_id;

    for j in 1 .. array_length(prod_keys, 1) loop
      insert into public.products (
        store_id, name, description, price, original_price, image,
        category, unit, stock, is_organic, is_active
      ) values (
        new_store_id,
        prod_names[j],
        prod_descs[j],
        prod_price[j],
        prod_orig[j],
        'https://picsum.photos/seed/zembil-' || store_keys[i] || '-' ||
          prod_keys[j] || '/800/600',
        prod_cats[j],
        prod_units[j],
        prod_stock[j],
        prod_org[j],
        true
      );
    end loop;
  end loop;

  raise notice 'Seeded 6 demo stores and 18 products each (108 products) for vendor %.', demo_vendor_email;
end $$;
