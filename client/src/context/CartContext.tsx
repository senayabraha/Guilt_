import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import toast from "react-hot-toast";
import type { CartItem, Product } from "../types";

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
  cartStoreId: string | null;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const getProductId = (product: Product) => product.id || product._id;
const getProductStoreId = (product: Product) => product.storeId || product.store?.id || null;

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem("app_cart");
    return saved ? JSON.parse(saved) : [];
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("app_cart", JSON.stringify(items));
  }, [items]);

  const addToCart = (product: Product, quantity = 1) => {
    const incomingStoreId = getProductStoreId(product);

    // Enforce one-store carts (compute from current items, not inside setState).
    const currentStoreId = items.find((item) => getProductStoreId(item.product))
      ? getProductStoreId(
          items.find((item) => getProductStoreId(item.product))!.product,
        )
      : null;

    if (currentStoreId && incomingStoreId && currentStoreId !== incomingStoreId) {
      toast(
        (t) => (
          <div className="flex flex-col gap-2 text-sm">
            <p className="font-medium">Item is from a different store</p>
            <p className="text-white/80">
              Your cart has items from another store. Clear it to start a new
              order?
            </p>
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => {
                  setItems([{ product, quantity }]);
                  toast.dismiss(t.id);
                  toast.success("Cart cleared — item added!");
                }}
                className="flex-1 py-1.5 bg-app-orange text-white text-xs font-semibold rounded-lg hover:bg-app-orange-dark transition-colors"
              >
                Clear cart &amp; add
              </button>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="flex-1 py-1.5 bg-white/20 text-white text-xs font-semibold rounded-lg hover:bg-white/30 transition-colors"
              >
                Keep current cart
              </button>
            </div>
          </div>
        ),
        {
          duration: 6000,
          style: {
            background: "#1B3022",
            color: "#fff",
            borderRadius: "12px",
            fontSize: "14px",
            maxWidth: "340px",
          },
        },
      );
      return;
    }

    setItems((prev) => {
      const productId = getProductId(product);
      const existing = prev.find((item) => getProductId(item.product) === productId);
      if (existing) {
        return prev.map((item) =>
          getProductId(item.product) === productId
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        );
      }
      return [...prev, { product, quantity }];
    });

    // Keep the customer on the current page; just confirm with a toast.
    // The cart only opens when they tap the cart button in the navbar.
    toast.success("Added to cart");
  };

  const removeFromCart = (productId: string) => {
    setItems((prev) => prev.filter((item) => getProductId(item.product) !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        getProductId(item.product) === productId ? { ...item, quantity } : item,
      ),
    );
  };

  const clearCart = () => {
    setItems([]);
    setIsCartOpen(false);
  };

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );
  const cartStoreId = items.find((item) => getProductStoreId(item.product))
    ? getProductStoreId(items.find((item) => getProductStoreId(item.product))!.product)
    : null;

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        cartTotal,
        cartStoreId,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
