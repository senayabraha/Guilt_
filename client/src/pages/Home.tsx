import { useEffect, useState } from "react";

import Hero from "../components/Home/Hero";
import HomeSearch from "../components/Home/HomeSearch";
import Features from "../components/Home/Features";
import ShopByStore from "../components/Home/ShopByStore";
import NearbyStores from "../components/Home/NearbyStores";
import TodaysDeals from "../components/Home/TodaysDeals";
import HomeCategories from "../components/Home/HomeCategories";
import PopularProducts from "../components/Home/PopularProducts";
import MarketplaceCTAs from "../components/Home/MarketplaceCTAs";
import Newsletter from "../components/Home/Newsletter";

import type { Store } from "../types";
import { getPublicStores } from "../lib/db/stores";

const Home = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [storesLoading, setStoresLoading] = useState(true);

  useEffect(() => {
    getPublicStores()
      .then(setStores)
      .catch(() => setStores([]))
      .finally(() => setStoresLoading(false));
  }, []);

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* 1. Hero */}
      <Hero />

      {/* 2. Search bar + location */}
      <HomeSearch />

      {/* 3. Trust / delivery badges */}
      <Features />

      {/* 4. Shop by store (compact) */}
      <ShopByStore stores={stores} loading={storesLoading} />

      {/* 5. Stores near you in Addis Ababa */}
      <NearbyStores stores={stores} loading={storesLoading} />

      {/* 6. Today's deals / store specials */}
      <TodaysDeals />

      {/* 7. Shop by category */}
      <HomeCategories />

      {/* 8. Fresh picks from Addis stores */}
      <PopularProducts />

      {/* 9 + 10. Vendor & Delivery Partner CTAs */}
      <MarketplaceCTAs />

      {/* 11. Newsletter */}
      <Newsletter />
    </div>
  );
};

export default Home;
