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

const CartSidebar = () => {
  const {
    items,
    updateQuantity,
    removeFromCart,
    clearCart,
    cartCount,
    cartTotal,
    isCartOpen,
    setIsCartOpen,
  } = useCart();

  const navigate = useNavigate();

  if (!isCartOpen) return null;

  const deliveryFee = cartTotal > 20 ? 0 : 1.99;
  const grandTotal = cartTotal + deliveryFee;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={() => setIsCartOpen(false)}
        className="fixed inset-0 bg-black/40 z-50 transition-opacity"
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-app-border">
          <div className="flex items-center gap-2">
            <ShoppingBagIcon className="size-5" />
            <h2 className="text-lg font-medium">Your Cart</h2>
            <span className="px-2 py-0.5 text-xs font-semibold bg-app-cream rounded-full">
              {cartCount} {cartCount === 1 ? "item" : "items"}
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
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingBagIcon className="size-16 text-app-border mb-4" />
              <h3 className="text-lg font-medium mb-1">Your cart is empty</h3>
              <p className="text-sm text-app-text-light mb-4">
                Add groceries from a product card, then come back here when you are ready.
              </p>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="px-4 py-2 rounded-xl bg-app-green text-white text-sm font-semibold hover:bg-green-900 transition-colors"
              >
                Continue shopping
              </button>
            </div>
          ) : (
            items.map((item) => {
              const productId = item.product.id || item.product._id;

              return (
                <div
                  key={productId}
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
                    <div className="flex items-center justify-between mt-2 gap-3">
                      <div
                        className="flex items-center rounded-lg bg-white border border-app-border overflow-hidden"
                        aria-label={`Quantity for ${item.product.name}`}
                      >
                        <button
                          type="button"
                          onClick={() => updateQuantity(productId, item.quantity - 1)}
                          className="size-8 flex-center hover:bg-app-cream transition-colors"
                          aria-label={`Decrease ${item.product.name} quantity`}
                        >
                          <MinusIcon className="size-3" />
                        </button>

                        <span className="text-sm font-semibold w-8 text-center">
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() => updateQuantity(productId, item.quantity + 1)}
                          className="size-8 flex-center hover:bg-app-cream transition-colors"
                          aria-label={`Increase ${item.product.name} quantity`}
                        >
                          <PlusIcon className="size-3" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-semibold">
                          {formatCurrency(item.product.price * item.quantity)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFromCart(productId)}
                          className="p-1.5 rounded-lg text-app-text-light hover:text-app-error hover:bg-red-50 transition-colors"
                          aria-label={`Remove ${item.product.name} from cart`}
                        >
                          <Trash2Icon className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-5 border-t border-app-border space-y-3">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="text-sm font-semibold text-app-green hover:text-green-900"
              >
                Continue shopping
              </button>
              <button
                type="button"
                onClick={clearCart}
                className="text-sm font-semibold text-app-error hover:text-red-700"
              >
                Clear cart
              </button>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-app-text-light">Subtotal</span>
              <span className="font-medium">{formatCurrency(cartTotal)}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-app-text-light">Estimated delivery</span>
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
                Free delivery on orders over {formatCurrency(20)}. Final fees are
                confirmed at checkout.
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
          </div>
        )}
      </div>
    </>
  );
};

export default CartSidebar;
