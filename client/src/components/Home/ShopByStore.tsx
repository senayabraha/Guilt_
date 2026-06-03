import { Link } from "react-router-dom";
import { ShoppingBasketIcon } from "lucide-react";

import type { Store } from "../../types";
import { deliveryEstimate } from "../../lib/format";
import { DEMO_STORES } from "../../lib/demoStores";

interface Props {
  stores: Store[];
  loading: boolean;
}

// Compact horizontal "store logo + name + delivery time" strip near the top,
// inspired by Instacart's store row.
const ShopByStore = ({ stores, loading }: Props) => {
  if (loading) {
    return (
      <section className="py-6">
        <div className="flex gap-5 overflow-x-auto no-scrollbar">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 shrink-0">
              <div className="size-16 rounded-2xl bg-white/70 border border-app-border animate-pulse" />
              <div className="h-3 w-16 bg-white/70 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  const hasStores = stores.length > 0;

  return (
    <section className="py-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-app-green">Shop by store</h2>
        <p className="text-sm text-app-text-light mt-0.5">
          Choose from local stores across Addis Ababa.
        </p>
      </div>

      <div className="flex gap-5 overflow-x-auto no-scrollbar pb-2">
        {hasStores
          ? stores.slice(0, 10).map((store) => (
              <Link
                key={store.id}
                to={`/stores/${store.id}`}
                className="group flex flex-col items-center gap-2 shrink-0 w-20"
              >
                <div className="size-16 rounded-2xl bg-white border border-app-border overflow-hidden flex-center shadow-sm group-hover:ring-2 ring-app-orange/40 transition-all">
                  {store.logo ? (
                    <img
                      src={store.logo}
                      alt={store.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ShoppingBasketIcon className="size-7 text-app-green" />
                  )}
                </div>
                <span className="text-xs font-medium text-zinc-700 text-center leading-tight line-clamp-2">
                  {store.name}
                </span>
                <span className="text-[10px] text-app-text-light">
                  {deliveryEstimate(store)}
                </span>
              </Link>
            ))
          : DEMO_STORES.map((s) => (
              <Link
                key={s.name}
                to="/stores"
                className="group flex flex-col items-center gap-2 shrink-0 w-20 opacity-90"
                title="Example store — seed data to go live"
              >
                <div className="size-16 rounded-2xl bg-app-green/10 flex-center text-app-green border border-app-border">
                  <ShoppingBasketIcon className="size-7" />
                </div>
                <span className="text-xs font-medium text-zinc-700 text-center leading-tight line-clamp-2">
                  {s.name}
                </span>
                <span className="text-[10px] text-app-text-light">
                  {s.estimate}
                </span>
              </Link>
            ))}
      </div>
    </section>
  );
};

export default ShopByStore;
