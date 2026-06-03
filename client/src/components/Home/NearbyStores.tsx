import { Link } from "react-router-dom";
import {
  ArrowRightIcon,
  ClockIcon,
  MapPinIcon,
  ShoppingBasketIcon,
} from "lucide-react";

import type { Store } from "../../types";
import StoreCard from "../StoreCard";
import { DEMO_STORES } from "../../lib/demoStores";

interface Props {
  stores: Store[];
  loading: boolean;
}

const NearbyStores = ({ stores, loading }: Props) => {
  return (
    <section className="py-10">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-app-green">
            Stores near you in Addis Ababa
          </h2>
          <p className="text-sm text-app-text-light mt-1 max-w-xl">
            Shop groceries and essentials from local stores around Bole,
            Kazanchis, CMC, Piassa, and more.
          </p>
        </div>
        <Link
          to="/stores"
          className="hidden sm:flex items-center gap-1 text-sm font-semibold text-app-orange hover:text-app-orange-dark transition-colors shrink-0"
        >
          View all <ArrowRightIcon className="size-4" />
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-60 rounded-2xl bg-white/60 border border-app-border animate-pulse"
            />
          ))}
        </div>
      ) : stores.length > 0 ? (
        <div className="flex gap-5 overflow-x-auto no-scrollbar pb-2 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible">
          {stores.slice(0, 6).map((store) => (
            <StoreCard
              key={store.id}
              store={store}
              className="min-w-[80%] sm:min-w-0"
            />
          ))}
        </div>
      ) : (
        <EmptyStores />
      )}
    </section>
  );
};

// Polished onboarding-style fallback (not a dead empty section).
const EmptyStores = () => (
  <div className="rounded-3xl border border-dashed border-app-border bg-gradient-to-br from-orange-50/60 to-white p-6 sm:p-8">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h3 className="text-lg font-semibold text-app-green">
          Local stores are coming to Zembil Market
        </h3>
        <p className="text-sm text-app-text-light mt-1 max-w-lg">
          No stores have been added yet. These are example stores across Addis
          Ababa — open a store or seed demo data to start selling.
        </p>
      </div>
      <Link
        to="/vendor/apply"
        className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-app-green text-white text-sm font-semibold hover:bg-app-green-light transition-colors shrink-0"
      >
        <ShoppingBasketIcon className="size-4" /> Open Your Store
      </Link>
    </div>

    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible">
      {DEMO_STORES.map((s) => (
        <div
          key={s.name}
          className="min-w-[72%] sm:min-w-0 bg-white rounded-2xl border border-app-border p-4 opacity-90"
        >
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-xl bg-app-green/10 flex-center text-app-green shrink-0">
              <ShoppingBasketIcon className="size-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-900 truncate">
                {s.name}
              </p>
              <p className="text-xs text-app-text-light flex items-center gap-1">
                <MapPinIcon className="size-3" /> {s.area}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-app-border text-xs text-app-text-light">
            <span className="flex items-center gap-1">
              <ClockIcon className="size-3" /> {s.estimate}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-orange-50 text-app-orange-dark font-medium">
              {s.tag}
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default NearbyStores;
