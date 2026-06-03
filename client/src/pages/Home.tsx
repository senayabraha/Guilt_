import { useEffect, useState } from "react";

import HomeSearch from "../components/Home/HomeSearch";
import QuickTabs from "../components/Home/QuickTabs";
import FeaturedStores from "../components/Home/FeaturedStores";
import Hero from "../components/Home/Hero";
import HomeCategories from "../components/Home/HomeCategories";
import Features from "../components/Home/Features";
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
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* Location + search (top) */}
      <HomeSearch />

      {/* Horizontal quick tabs */}
      <QuickTabs />

      {/* Featured stores grid (store-first) */}
      <FeaturedStores stores={stores} loading={storesLoading} />

      {/* Compact promo / hero card */}
      <Hero />

      {/* Shop by category */}
      <HomeCategories />

      {/* Trust cards row */}
      <Features />

      {/* Lower, compact store-owner & delivery CTAs */}
      <MarketplaceCTAs />

      {/* Stay in the loop */}
      <Newsletter />
    </div>
  );
};

export default Home;
