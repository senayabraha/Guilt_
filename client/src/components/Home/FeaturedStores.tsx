import { Link } from "react-router-dom";
import { ShoppingBasketIcon } from "lucide-react";

import type { Store } from "../../types";
import { DEMO_STORES } from "../../lib/demoStores";

interface Props {
  stores: Store[];
  loading: boolean;
}

// Compact Instacart-style store row. No delivery time, no distance — just
// logo/icon, name, and a short category.
const prettyCategory = (slug?: string) =>
  slug
    ? slug
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    : "";

const FeaturedStores = ({ stores, loading }: Props) => {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-app-green mb-4">
        Featured stores
      </h2>

      {loading ? (
        <div className="flex gap-4 overflow-x-auto no-scrollbar">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 shrink-0">
              <div className="size-20 rounded-2xl bg-white/70 border border-app-border animate-pulse" />
              <div className="h-3 w-16 bg-white/70 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : stores.length > 0 ? (
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1">
          {stores.slice(0, 12).map((store) => (
            <Link
              key={store.id}
              to={`/stores/${store.id}`}
              className="group flex flex-col items-center gap-1.5 shrink-0 w-24"
            >
              <div className="size-20 rounded-2xl bg-white border border-app-border overflow-hidden flex-center shadow-sm group-hover:ring-2 ring-app-orange/40 transition-all">
                {store.logo ? (
                  <img
                    src={store.logo}
                    alt={store.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ShoppingBasketIcon className="size-8 text-app-green" />
                )}
              </div>
              <span className="text-xs font-medium text-zinc-700 text-center leading-tight line-clamp-2">
                {store.name}
              </span>
              {store.categories?.[0] && (
                <span className="text-[10px] text-app-text-light text-center leading-none line-clamp-1">
                  {prettyCategory(store.categories[0])}
                </span>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <FeaturedStoresFallback />
      )}
    </section>
  );
};

// Kept fallback: "Local stores are coming to Zembil Market".
const FeaturedStoresFallback = () => (
  <div className="rounded-2xl border border-dashed border-app-border bg-gradient-to-br from-orange-50/60 to-white p-5">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
      <div>
        <h3 className="text-base font-semibold text-app-green">
          Local stores are coming to Zembil Market
        </h3>
        <p className="text-sm text-app-text-light mt-1 max-w-lg">
          No stores have been added yet. Open a store or seed demo data to start
          selling.
        </p>
      </div>
      <Link
        to="/vendor/apply"
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-app-green text-white text-sm font-semibold hover:bg-app-green-light transition-colors shrink-0"
      >
        <ShoppingBasketIcon className="size-4" /> Open Your Store
      </Link>
    </div>

    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1">
      {DEMO_STORES.map((s) => (
        <div
          key={s.name}
          className="flex flex-col items-center gap-1.5 shrink-0 w-24 opacity-90"
        >
          <div className="size-20 rounded-2xl bg-app-green/10 flex-center text-app-green border border-app-border">
            <ShoppingBasketIcon className="size-8" />
          </div>
          <span className="text-xs font-medium text-zinc-700 text-center leading-tight line-clamp-2">
            {s.name}
          </span>
          <span className="text-[10px] text-app-text-light text-center leading-none line-clamp-1">
            {s.tag}
          </span>
        </div>
      ))}
    </div>
  </div>
);

export default FeaturedStores;
