import { CheckIcon, TruckIcon } from "lucide-react";
import type { Address } from "../../types";
import { formatCurrency } from "../../lib/format";

interface CheckoutReviewProps {
  address: Address;
  items: any[];
  handlePlaceOrder: () => void;
  loading: boolean;
  total: number;
}

export default function CheckoutReview({
  address,
  items,
  handlePlaceOrder,
  loading,
  total,
}: CheckoutReviewProps) {
  return (
    <div className="bg-white rounded-2xl p-6 animate-fade-in">
      <h2 className="text-lg font-semibold text-app-green mb-5 flex items-center gap-2">
        <CheckIcon className="size-5" /> Review Your Order
      </h2>

      {/* Delivery Info */}
      <div className="mb-5 p-4 bg-app-cream rounded-xl">
        <div className="flex items-center gap-2 mb-2">
          <TruckIcon className="size-4 text-app-green" />
          <span className="text-sm font-semibold text-app-green">
            Deliver to
          </span>
        </div>
        <p className="text-sm font-medium text-app-green">
          {address.label}
          {address.zip ? ` · ${address.zip}` : ""}
        </p>
        <p className="text-sm text-app-text-light">
          {address.city}
          {address.state ? `, ${address.state}` : ""}
        </p>
        {address.address && (
          <p className="text-sm text-app-text-light">{address.address}</p>
        )}
        {address.lat && address.lng ? (
          <p className="text-xs text-app-success mt-1">Pinned location saved</p>
        ) : null}
      </div>

      {/* Items */}
      <div className="space-y-3 mb-5">
        {items.map((item) => (
          <div key={item.product._id} className="flex items-center gap-3">
            <img
              src={item.product.image}
              alt={item.product.name}
              className="size-12 rounded-lg object-cover"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-app-green">
                {item.product.name}
              </p>
              <p className="text-xs text-app-text-light">
                Qty: {item.quantity}
              </p>
            </div>
            <span className="text-sm font-semibold">
              {formatCurrency(item.product.price * item.quantity)}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={handlePlaceOrder}
        disabled={loading}
        className="w-full py-3 bg-app-orange text-white font-semibold rounded-xl hover:bg-app-orange-dark transition-colors disabled:opacity-60 active:scale-[0.98]"
      >
        {loading
          ? "Placing Order..."
          : `Place Order — ${formatCurrency(total)}`}
      </button>
    </div>
  );
}
