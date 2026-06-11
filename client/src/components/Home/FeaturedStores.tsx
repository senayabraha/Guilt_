import { Link } from "react-router-dom";
import { ChevronRightIcon, ShoppingBasketIcon, StoreIcon } from "lucide-react";

import type { Store } from "../../types";
import { formatCurrency } from "../../lib/format";
import { sortStoresByDistance, type Coords } from "../../lib/geo";

interface Props {
  stores: Store[];
  loading: boolean;
  pin?: Coords | null;
}

// Compact Instacart-style store logo grid: square logo tile, store name, a
// small "Open" badge, and delivery fee. Store-first browsing — tapping a tile
// opens that store's detail page. No vendor/delivery CTAs in this section.
const FeaturedStores = ({ stores, loading, pin }: Props) => {
  const gridClass =
    "grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-x-3 gap-y-4";

  // Closest stores first when a delivery pin is set.
  const ordered = pin ? sortStoresByDistance(stores, pin) : stores;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-app-green">
          Featured stores
        </h2>
        {stores.length > 0 && (
          <Link
            to="/stores"
            className="text-xs font-semibold text-app-orange hover:text-app-orange-dark"
          >
            Show all
          </Link>
        )}
      </div>

      {loading ? (
        <div className={gridClass}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div className="w-full aspect-square rounded-2xl bg-white/70 border border-app-border animate-pulse" />
              <div className="h-2.5 w-12 bg-white/70 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : stores.length > 0 ? (
        <div className={gridClass}>
          {ordered.slice(0, 15).map((store) => (
            <Link
              key={store.id}
              to={`/stores/${store.id}`}
              className="group flex flex-col items-center gap-1.5 text-center"
            >
              <div className="relative w-full aspect-square rounded-2xl bg-white border border-app-border overflow-hidden flex-center shadow-sm group-hover:ring-2 ring-app-orange/40 transition-all">
                {store.logo ? (
                  <img
                    src={store.logo}
                    alt={store.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ShoppingBasketIcon className="size-7 text-app-green" />
                )}
                {store.isOpen && (
                  <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[9px] font-semibold leading-none">
                    Open
                  </span>
                )}
              </div>
              <span className="text-xs font-medium text-zinc-700 leading-tight line-clamp-2">
                {store.name}
              </span>
              <span className="text-[10px] text-app-text-light leading-none">
                {(store.deliveryFee ?? 0) > 0
                  ? `${formatCurrency(store.deliveryFee)} delivery`
                  : "Free delivery"}
              </span>
            </Link>
          ))}

          {/* Show all tile */}
          <Link
            to="/stores"
            className="group flex flex-col items-center gap-1.5 text-center"
          >
            <div className="w-full aspect-square rounded-2xl border border-dashed border-app-border bg-app-cream/40 flex-center text-app-green group-hover:bg-app-cream transition-colors">
              <ChevronRightIcon className="size-6" />
            </div>
            <span className="text-xs font-medium text-app-green leading-tight">
              Show all
            </span>
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-app-border bg-app-cream/40 px-5 py-8 text-center">
          <div className="size-12 rounded-2xl bg-app-green/10 flex-center mx-auto mb-3 text-app-green">
            <StoreIcon className="size-6" />
          </div>
          <p className="text-sm font-semibold text-app-green">
            Stores are coming soon
          </p>
          <p className="text-xs text-app-text-light mt-1">
            Local stores will appear here when ready.
          </p>
        </div>
      )}
    </section>
  );
};

export default FeaturedStores;
