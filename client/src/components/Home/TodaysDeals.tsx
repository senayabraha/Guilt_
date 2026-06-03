import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRightIcon, PlusIcon, TagIcon } from "lucide-react";
import toast from "react-hot-toast";

import type { Product } from "../../types";
import { getPublicProducts } from "../../lib/db/products";
import { useCart } from "../../context/CartContext";
import { formatCurrency } from "../../lib/format";

const TodaysDeals = () => {
  const [deals, setDeals] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    getPublicProducts({})
      .then((products) => {
        const discounted = products
          .filter((p) => p.discount > 0 && p.originalPrice > p.price)
          .sort((a, b) => b.discount - a.discount)
          .slice(0, 8);
        setDeals(discounted);
      })
      .catch((error: any) =>
        toast.error(error?.message || "Failed to load deals"),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="py-10">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-app-green flex items-center gap-2">
            <TagIcon className="size-6 text-app-orange" /> Today&apos;s deals
          </h2>
          <p className="text-sm text-app-text-light mt-1">
            Save on fresh picks and everyday essentials from local stores.
          </p>
        </div>
        <Link
          to="/deals"
          className="hidden sm:flex items-center gap-1 text-sm font-semibold text-app-orange hover:text-app-orange-dark transition-colors shrink-0"
        >
          All deals <ArrowRightIcon className="size-4" />
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-40 rounded-2xl bg-white/60 border border-app-border animate-pulse"
            />
          ))}
        </div>
      ) : deals.length > 0 ? (
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 sm:grid sm:grid-cols-3 lg:grid-cols-4 sm:overflow-visible">
          {deals.map((p) => (
            <div
              key={p.id}
              className="min-w-[60%] sm:min-w-0 bg-white rounded-2xl border border-app-border overflow-hidden shadow-sm flex flex-col"
            >
              <Link to={`/products/${p.id}`} className="relative block">
                <div className="aspect-[4/3] bg-app-cream/50 overflow-hidden">
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-full h-full object-cover p-3"
                  />
                </div>
                <span className="absolute top-2.5 left-2.5 px-2 py-0.5 text-[10px] font-semibold uppercase bg-app-orange text-white rounded-full">
                  {p.discount}% OFF
                </span>
              </Link>
              <div className="p-3 flex flex-col flex-1">
                <Link
                  to={`/products/${p.id}`}
                  className="text-sm font-medium text-zinc-800 line-clamp-2 hover:text-app-green transition-colors"
                >
                  {p.name}
                </Link>
                {p.store?.name && (
                  <p className="text-[11px] text-app-text-light mt-0.5 truncate">
                    {p.store.name}
                  </p>
                )}
                <div className="flex items-center justify-between mt-auto pt-2.5">
                  <div className="leading-tight">
                    <span className="text-sm font-semibold text-app-green">
                      {formatCurrency(p.price)}
                    </span>
                    {p.originalPrice > p.price && (
                      <span className="block text-[11px] text-app-text-light line-through">
                        {formatCurrency(p.originalPrice)}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => addToCart(p)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-app-orange text-white text-xs font-semibold hover:bg-app-orange-dark transition-colors active:scale-95"
                  >
                    <PlusIcon className="size-3.5" /> Add
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-app-border bg-gradient-to-br from-orange-50/60 to-white p-8 text-center">
          <div className="size-14 rounded-2xl bg-app-orange/10 flex-center mx-auto mb-4">
            <TagIcon className="size-7 text-app-orange" />
          </div>
          <h3 className="text-lg font-semibold text-app-green">
            Deals are on the way
          </h3>
          <p className="text-sm text-app-text-light mt-1 max-w-md mx-auto">
            Store specials and discounts from local stores will show up here.
            Browse stores while new offers arrive across Addis Ababa.
          </p>
          <Link
            to="/stores"
            className="mt-5 inline-flex items-center gap-2 px-5 py-3 rounded-full bg-app-green text-white text-sm font-semibold hover:bg-app-green-light transition-colors"
          >
            Browse Stores <ArrowRightIcon className="size-4" />
          </Link>
        </div>
      )}
    </section>
  );
};

export default TodaysDeals;
