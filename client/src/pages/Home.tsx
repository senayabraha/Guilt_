import { useEffect, useState } from "react";

import HomeSearch from "../components/Home/HomeSearch";
import FeaturedStores from "../components/Home/FeaturedStores";
import Hero from "../components/Home/Hero";
import Features from "../components/Home/Features";
import HomeCategories from "../components/Home/HomeCategories";
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
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
      {/* 1. Location + search (top) */}
      <HomeSearch />

      {/* 2. Featured stores (compact row) */}
      <FeaturedStores stores={stores} loading={storesLoading} />

      {/* 3. Smaller hero card */}
      <Hero />

      {/* 4. Trust badges (horizontal row) */}
      <Features />

      {/* 5. Shop by category */}
      <HomeCategories />

      {/* 6 + 7. Vendor & Delivery Partner CTAs */}
      <MarketplaceCTAs />

      {/* 8. Newsletter */}
      <Newsletter />
    </div>
  );
};

export default Home;
