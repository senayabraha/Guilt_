import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HeartIcon, ShoppingBasketIcon } from "lucide-react";
import toast from "react-hot-toast";

import type { Product } from "../types";
import Loading from "../components/Loading";
import ProductCard from "../components/ProductCard";
import StatusState from "../components/StatusState";
import { useFavorites } from "../context/useFavorites";
import { getFavoriteProducts } from "../lib/db/favorites";

export default function SavedItems() {
  const { favoriteIds, refreshFavorites } = useFavorites();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSavedProducts = async () => {
    setLoading(true);
    try {
      setProducts(await getFavoriteProducts());
      await refreshFavorites();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load saved items";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => loadSavedProducts());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleProducts = products.filter((product) =>
    favoriteIds.has(product.id || product._id),
  );

  return (
    <div className="min-h-screen bg-app-cream">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-app-green">
              <HeartIcon className="size-6 text-app-orange fill-app-orange" />
              Saved Items
            </h1>
            <p className="mt-1 text-sm text-app-text-light">
              Products you saved for later, restocking, or repeat orders.
            </p>
          </div>
          <Link
            to="/products"
            className="inline-flex items-center justify-center rounded-xl border border-app-border bg-white px-4 py-2 text-sm font-semibold text-app-green transition-colors hover:bg-app-cream"
          >
            Browse Products
          </Link>
        </div>

        {loading ? (
          <Loading />
        ) : visibleProducts.length === 0 ? (
          <StatusState
            icon={ShoppingBasketIcon}
            title="No saved items yet"
            description="Save products from the product grid or detail modal to find them quickly later."
            action={
              <Link
                to="/products"
                className="inline-flex items-center justify-center rounded-xl bg-app-green px-5 py-2.5 text-sm font-semibold text-white hover:bg-app-green-light"
              >
                Browse Products
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:gap-6">
            {visibleProducts.map((product) => (
              <ProductCard key={product.id || product._id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
