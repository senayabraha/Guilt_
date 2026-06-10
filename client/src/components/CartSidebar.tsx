import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRightIcon,
  MinusIcon,
  PlusIcon,
  ShoppingBagIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";

import { useCart } from "../context/CartContext";
import { formatCurrency } from "../lib/format";
import StatusState from "./StatusState";

const CartSidebar = () => {
  const {
    items,
    updateQuantity,
    removeFromCart,
    cartTotal,
    isCartOpen,
    setIsCartOpen,
  } = useCart();

  const navigate = useNavigate();

  const deliveryFee = cartTotal > 20 ? 0 : 1.99;
  const grandTotal = cartTotal + deliveryFee;

  useEffect(() => {
    if (!isCartOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsCartOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isCartOpen, setIsCartOpen]);

  if (!isCartOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={() => setIsCartOpen(false)}
        className="fixed inset-0 bg-black/40 z-50 transition-opacity"
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-slide-in-right"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-app-border">
          <div className="flex items-center gap-2">
            <ShoppingBagIcon className="size-5" />
            <h2 id="cart-title" className="text-lg font-medium">Your Cart</h2>
            <span className="px-2 py-0.5 text-xs font-semibold bg-app-cream rounded-full">
              {items.length} items
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsCartOpen(false)}
            className="p-2 rounded-xl hover:bg-app-cream transition-colors"
            aria-label="Close cart"
          >
            <XIcon className="size-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {items.length === 0 ? (
            <StatusState
              icon={ShoppingBagIcon}
              title="Your cart is empty"
              description="Add grocery staples, fresh items, or household essentials to start an order."
              className="border-0 shadow-none"
              action={
                <button
                  type="button"
                  onClick={() => {
                    setIsCartOpen(false);
                    navigate("/products");
                  }}
                  className="inline-flex items-center justify-center rounded-xl bg-app-green px-5 py-2.5 text-sm font-semibold text-white hover:bg-app-green-light"
                >
                  Browse Products
                </button>
              }
            />
          ) : (
            items.map((item) => (
              <div
                key={item.product.id}
                className="flex gap-3 bg-app-cream/60 rounded-xl p-3"
              >
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  className="size-16 rounded-lg object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold truncate">
                    {item.product.name}
                  </h4>
                  <p className="text-xs text-app-text-light">
                    {formatCurrency(item.product.price)} / {item.product.unit}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.product.id || item.product._id, item.quantity - 1)
                        }
                        className="size-7 rounded-lg bg-white border border-app-border flex-center"
                        aria-label={`Decrease quantity for ${item.product.name}`}
                      >
                        <MinusIcon className="size-3" />
                      </button>

                      <span className="text-sm font-semibold w-6 text-center">
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.product.id || item.product._id, item.quantity + 1)
                        }
                        className="size-7 rounded-lg bg-white border border-app-border flex-center"
                        aria-label={`Increase quantity for ${item.product.name}`}
                      >
                        <PlusIcon className="size-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {formatCurrency(item.product.price * item.quantity)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id || item.product._id)}
                        className="p-1 text-app-text-light hover:text-app-error transition-colors"
                        aria-label={`Remove ${item.product.name} from cart`}
                      >
                        <Trash2Icon className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-5 border-t border-app-border space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-app-text-light">Subtotal</span>
              <span className="font-medium">{formatCurrency(cartTotal)}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-app-text-light">Delivery</span>
              <span className="font-medium">
                {deliveryFee === 0 ? (
                  <span className="text-app-success">Free</span>
                ) : (
                  formatCurrency(deliveryFee)
                )}
              </span>
            </div>

            {deliveryFee > 0 && (
              <p className="text-xs text-app-text-light text-center">
                Free delivery on orders over {formatCurrency(20)}!
              </p>
            )}

            <div className="flex justify-between text-base font-semibold border-t border-app-border pt-3">
              <span>Total</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsCartOpen(false);
                navigate("/checkout");
                window.scrollTo(0, 0);
              }}
              className="w-full py-3 bg-app-orange text-white font-semibold rounded-xl hover:bg-app-orange-dark transition-colors flex-center gap-2 active:scale-[0.98]"
            >
              Proceed to Checkout <ArrowRightIcon className="size-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsCartOpen(false)}
              className="w-full py-2.5 text-sm font-medium text-app-text-light hover:text-app-green transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </aside>
    </>
  );
};

export default CartSidebar;
