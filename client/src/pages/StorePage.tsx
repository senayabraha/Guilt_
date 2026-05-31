import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { MapPin, Store as StoreIcon } from "lucide-react";
import api from "../config/api";
import type { Store, StoreSummary } from "../types";
import ProductCard from "../components/ProductCard";
import Loading from "../components/Loading";

const StorePage = () => {
  const { slug } = useParams();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStore = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/stores/${slug}`);
        setStore(data.store);
      } catch {
        console.error("Failed to fetch store");
      } finally {
        setLoading(false);
      }
    };
    fetchStore();
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Loading />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-semibold text-app-green">Store not found</h2>
      </div>
    );
  }

  const products = store.products || [];

  // Attach store summary so adding to cart carries store identity (store-locked cart)
  const storeSummary: StoreSummary = {
    id: store.id,
    name: store.name,
    slug: store.slug,
    deliveryFee: store.deliveryFee,
    taxRate: store.taxRate,
    minOrderAmount: store.minOrderAmount,
    isActive: store.isActive,
    isApproved: store.isApproved,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex gap-4 items-center mb-6">
        {store.logo ? (
          <img
            src={store.logo}
            alt={store.name}
            className="size-20 rounded-2xl object-cover"
          />
        ) : (
          <div className="size-20 rounded-2xl bg-app-cream flex-center">
            <StoreIcon className="size-9 text-app-green" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-semibold text-app-green">{store.name}</h1>
          {store.subCity && (
            <p className="text-app-text-light flex items-center gap-1">
              <MapPin className="size-4" /> {store.subCity}
            </p>
          )}
          {store.description && (
            <p className="text-sm text-app-text-light mt-1">{store.description}</p>
          )}
        </div>
      </div>

      {products.length === 0 ? (
        <p className="text-app-text-light">This store has no products yet.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={{ ...product, storeId: store.id, store: storeSummary }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default StorePage;
