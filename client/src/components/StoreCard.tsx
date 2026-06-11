import { Link } from "react-router-dom";
import { BikeIcon, MapPinIcon, ShoppingBasketIcon, StarIcon } from "lucide-react";

import type { Store } from "../types";
import { formatCurrency, storeLocation } from "../lib/format";
import { storeDistanceLabel, type Coords } from "../lib/geo";

interface Props {
  store: Store;
  pin?: Coords | null;
  className?: string;
}

const StoreCard = ({ store, pin, className = "" }: Props) => {
  const distance = storeDistanceLabel(store, pin ?? null);

  return (
    <Link
      to={`/stores/${store.id}`}
      className={`bg-white rounded-2xl overflow-hidden shadow hover:shadow-md transition-all duration-300 group animate-fade-in flex flex-col ${className}`}
    >
      {/* Cover image */}
      <div className="relative h-32 bg-app-green/10 overflow-hidden">
        {store.coverImage ? (
          <img
            src={store.coverImage}
            alt={store.name}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex-center text-app-green/30">
            <ShoppingBasketIcon className="size-10" />
          </div>
        )}

        {/* Open/Closed badge */}
        <span
          className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-semibold shadow-sm ${
            store.isOpen
              ? "bg-green-100 text-green-700"
              : "bg-zinc-800/70 text-zinc-100"
          }`}
        >
          {store.isOpen ? "Open" : "Closed"}
        </span>
      </div>

      {/* Info section */}
      <div className="p-4 flex flex-col flex-1">
        {/* Logo floated above content */}
        <div className="flex items-end gap-3 -mt-10 mb-3">
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

        {/* Name */}
        <h3 className="text-base font-semibold text-zinc-900 group-hover:text-app-green transition-colors line-clamp-1">
          {store.name}
        </h3>

        {/* Status row: open badge + distance + rating */}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span
            className={`text-xs font-medium ${
              store.isOpen ? "text-green-600" : "text-zinc-400"
            }`}
          >
            {store.isOpen ? "Open now" : "Closed"}
          </span>

          {distance && (
            <>
              <span className="text-zinc-300 text-xs">·</span>
              <span className="flex items-center gap-0.5 text-xs text-zinc-500">
                <MapPinIcon className="size-3 shrink-0" />
                {distance}
              </span>
            </>
          )}

          {(store as any).rating > 0 && (
            <>
              <span className="text-zinc-300 text-xs">·</span>
              <span className="flex items-center gap-0.5 text-xs text-zinc-600 font-medium">
                <StarIcon className="size-3 text-amber-400 fill-amber-400 shrink-0" />
                {Number((store as any).rating).toFixed(1)}
              </span>
            </>
          )}
        </div>

        {/* Location */}
        {!distance && (
          <p className="text-xs text-app-text-light mt-1 flex items-center gap-1">
            <MapPinIcon className="size-3 shrink-0" />
            {storeLocation(store)}
          </p>
        )}

        {/* Delivery + min order */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-app-border text-xs text-app-text-light mt-3">
          <span className="flex items-center gap-1">
            <BikeIcon className="size-3.5" />
            {(store.deliveryFee ?? 0) > 0
              ? `${formatCurrency(store.deliveryFee)} delivery`
              : "Free delivery"}
          </span>
          {(store.minOrder ?? 0) > 0 && (
            <span className="text-zinc-500">
              Min {formatCurrency(store.minOrder)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default StoreCard;
