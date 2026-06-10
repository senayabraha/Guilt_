import { BanknoteIcon, CheckIcon, MapPinIcon, PhoneIcon, TruckIcon } from "lucide-react";
import type { Address } from "../../types";
import { formatCurrency } from "../../lib/format";

interface CheckoutReviewProps {
  address: Address;
  phone: string;
  instructions: string;
  items: any[];
  handlePlaceOrder: () => void;
  loading: boolean;
  total: number;
}

export default function CheckoutReview({
  address,
  phone,
  instructions,
  items,
  handlePlaceOrder,
  loading,
  total,
}: CheckoutReviewProps) {
  return (
    <div className="bg-white rounded-2xl p-6 animate-fade-in space-y-5">
      <h2 className="text-lg font-semibold text-app-green flex items-center gap-2">
        <CheckIcon className="size-5" /> Review Your Order
      </h2>

      {/* Delivery address */}
      <div className="p-4 bg-app-cream rounded-xl space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <TruckIcon className="size-4 text-app-green" />
          <span className="text-sm font-semibold text-app-green">
            Deliver to
          </span>
        </div>

        <div className="flex items-start gap-2 text-sm">
          <MapPinIcon className="size-4 text-app-text-light shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-zinc-800">
              {address.label}
              {address.city ? ` — ${address.city}` : ""}
              {address.state ? `, ${address.state}` : ""}
            </p>
            {address.address && (
              <p className="text-app-text-light text-xs mt-0.5">
                {address.address}
              </p>
            )}
            {address.lat && address.lng ? (
              <p className="text-[11px] text-app-success mt-0.5">
                Pinned location saved
              </p>
            ) : null}
          </div>
        </div>

        {phone && (
          <div className="flex items-center gap-2 text-sm">
            <PhoneIcon className="size-4 text-app-text-light shrink-0" />
            <span className="text-zinc-700">{phone}</span>
          </div>
        )}

        {instructions && (
          <p className="text-xs text-app-text-light italic border-t border-app-border pt-2 mt-1">
            "{instructions}"
          </p>
        )}
      </div>

      {/* Payment method */}
      <div className="flex items-center gap-2 text-sm text-zinc-700">
        <BanknoteIcon className="size-4 text-app-green" />
        <span>Cash on Delivery</span>
      </div>

      {/* Items */}
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.product._id || item.product.id}
            className="flex items-center gap-3"
          >
            <img
              src={item.product.image}
              alt={item.product.name}
              className="size-12 rounded-lg object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-800 truncate">
                {item.product.name}
              </p>
              <p className="text-xs text-app-text-light">
                {item.quantity} × {formatCurrency(item.product.price)}
              </p>
            </div>
            <span className="text-sm font-semibold shrink-0">
              {formatCurrency(item.product.price * item.quantity)}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handlePlaceOrder}
        disabled={loading}
        className="w-full py-3.5 bg-app-orange text-white font-semibold rounded-xl hover:bg-app-orange-dark transition-colors disabled:opacity-60 active:scale-[0.98]"
      >
        {loading
          ? "Placing Order…"
          : `Place Order — ${formatCurrency(total)}`}
      </button>
    </div>
  );
}
