import { Link } from "react-router-dom";
import {
  BikeIcon,
  ClockIcon,
  MapPinIcon,
  ShoppingBasketIcon,
} from "lucide-react";

import type { Store } from "../types";
import {
  deliveryEstimate,
  formatCurrency,
  storeLocation,
  storeTags,
} from "../lib/format";

interface Props {
  store: Store;
  className?: string;
}

// Instacart-style store card: answers "how soon, where, is it open, what type,
// cash on delivery?, delivery fee" at a glance.
const StoreCard = ({ store, className = "" }: Props) => {
  const tags = storeTags(store);

  return (
    <Link
      to={`/stores/${store.id}`}
      className={`bg-white rounded-2xl overflow-hidden shadow hover:shadow-md transition-all duration-300 group animate-fade-in flex flex-col ${className}`}
    >
      {/* Cover */}
      <div className="relative h-28 bg-app-green/10 overflow-hidden">
        {store.coverImage ? (
          <img
            src={store.coverImage}
            alt={store.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex-center text-app-green/30">
            <ShoppingBasketIcon className="size-9" />
          </div>
        )}
        <span
          className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-semibold ${
            store.isOpen
              ? "bg-green-100 text-green-700"
              : "bg-zinc-200 text-zinc-600"
          }`}
        >
          {store.isOpen ? "Open now" : "Closed"}
        </span>
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white/90 text-app-green shadow-sm">
          <ClockIcon className="size-3" /> {deliveryEstimate(store)}
        </span>
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-3 -mt-9 mb-3">
          <div className="size-14 rounded-xl bg-white border border-app-border overflow-hidden shrink-0 flex-center shadow-sm">
            {store.logo ? (
              <img
                src={store.logo}
                alt={store.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <ShoppingBasketIcon className="size-6 text-app-green" />
            )}
          </div>
        </div>

        <h3 className="text-base font-semibold text-zinc-900 group-hover:text-app-green transition-colors line-clamp-1">
          {store.name}
        </h3>

        <p className="text-xs text-app-text-light mt-1 flex items-center gap-1">
          <MapPinIcon className="size-3 shrink-0" /> {storeLocation(store)}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="px-2 py-0.5 text-[10px] font-medium bg-orange-50 text-app-orange-dark rounded-full"
            >
              {t}
            </span>
          ))}
        </div>

        {/* Delivery / min order */}
        <div className="flex items-center justify-between mt-auto pt-3 mt-3 border-t border-app-border text-xs text-app-text-light">
          <span className="flex items-center gap-1">
            <BikeIcon className="size-3" />{" "}
            {(store.deliveryFee ?? 0) > 0
              ? `${formatCurrency(store.deliveryFee)} delivery`
              : "Free delivery"}
          </span>
          {(store.minOrder ?? 0) > 0 && (
            <span>Min {formatCurrency(store.minOrder)}</span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default StoreCard;
