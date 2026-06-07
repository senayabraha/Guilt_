/* eslint-disable react-refresh/only-export-components */
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
const getCartStoreId = (cartItems: CartItem[]) => {
  const storeItem = cartItems.find((item) => getProductStoreId(item.product));
  return storeItem ? getProductStoreId(storeItem.product) : null;
};

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
    const currentStoreId = getCartStoreId(items);

    if (currentStoreId && incomingStoreId && currentStoreId !== incomingStoreId) {
      const storeName = product.store?.name || "this store";

      toast.custom(
        (t) => (
          <div className="max-w-sm rounded-2xl bg-white p-4 text-sm text-app-text shadow-xl border border-app-border">
            <p className="font-semibold text-app-green">Start a new store order?</p>
            <p className="mt-1 text-app-text-light">
              Your cart already has items from another store. Clear it to start a
              new order from {storeName}.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => toast.dismiss(t.id)}
                className="flex-1 rounded-xl border border-app-border px-3 py-2 font-medium hover:bg-app-cream"
              >
                Keep cart
              </button>
              <button
                type="button"
                onClick={() => {
                  setItems([{ product, quantity }]);
                  toast.dismiss(t.id);
                  toast.success(`Started a new cart from ${storeName}`);
                }}
                className="flex-1 rounded-xl bg-app-orange px-3 py-2 font-semibold text-white hover:bg-app-orange-dark"
              >
                Clear & add
              </button>
            </div>
          </div>
        ),
        { duration: 6000 },
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

    toast.success(`${product.name} added to cart`);
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
  const cartStoreId = getCartStoreId(items);

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
