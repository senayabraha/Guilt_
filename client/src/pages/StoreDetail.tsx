import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  StoreIcon,
  MapPinIcon,
  PhoneIcon,
  BikeIcon,
  Home,
} from "lucide-react";
import toast from "react-hot-toast";

import type { Product, Store } from "../types";
import ProductCard from "../components/ProductCard";
import Loading from "../components/Loading";
import { getPublicStore, getPublicStoreProducts } from "../lib/db/stores";
import { formatCurrency } from "../lib/format";

const StoreDetail = () => {
  const { id } = useParams();

  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [storeData, productsData] = await Promise.all([
          getPublicStore(id),
          getPublicStoreProducts(id),
        ]);
        setStore(storeData);
        setProducts(productsData);
      } catch (error: any) {
        toast.error(error?.message || "Failed to load store");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <Loading />;

  if (!store) {
    return (
      <div className="min-h-screen bg-app-cream flex-center">
        <div className="text-center">
          <StoreIcon className="size-12 text-app-text-light mx-auto mb-3" />
          <p className="text-lg font-semibold text-app-green mb-2">
            Store not found
          </p>
          <Link
            to="/stores"
            className="text-sm font-medium text-app-orange hover:text-app-orange-dark"
          >
            Back to stores
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-cream">
      {/* Cover */}
      <div className="relative h-40 sm:h-56 bg-app-green/10 overflow-hidden">
        {store.coverImage ? (
          <img
            src={store.coverImage}
            alt={store.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex-center text-app-green/30">
            <StoreIcon className="size-16" />
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-app-text-light mt-4">
          <Link to="/" className="hover:text-app-green transition-colors">
            <Home className="size-4" />
          </Link>
          <span>/</span>
          <Link to="/stores" className="hover:text-app-green transition-colors">
            Stores
          </Link>
          <span>/</span>
          <span className="text-app-green font-medium">{store.name}</span>
        </nav>

        {/* Store Header */}
        <div className="bg-white rounded-2xl border border-app-border p-6 mt-4 flex flex-col sm:flex-row gap-5 items-start">
          <div className="size-20 rounded-2xl bg-white border border-app-border overflow-hidden shrink-0 flex-center -mt-12 shadow">
            {store.logo ? (
              <img
                src={store.logo}
                alt={store.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <StoreIcon className="size-8 text-app-green" />
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold text-app-green">
                {store.name}
              </h1>
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${store.isOpen ? "bg-green-100 text-green-700" : "bg-zinc-200 text-zinc-600"}`}
              >
                {store.isOpen ? "Open" : "Closed"}
              </span>
            </div>

            {store.description && (
              <p className="text-sm text-app-text-light mt-1.5">
                {store.description}
              </p>
            )}

            {store.categories?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {store.categories.map((c) => (
                  <span
                    key={c}
                    className="px-2 py-0.5 text-[10px] font-medium bg-orange-50 text-app-orange-dark rounded-full capitalize"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-xs text-app-text-light">
              <span className="flex items-center gap-1">
                <MapPinIcon className="size-3.5" /> {store.address}, {store.city},{" "}
                {store.state}
              </span>
              {store.phone && (
                <span className="flex items-center gap-1">
                  <PhoneIcon className="size-3.5" /> {store.phone}
                </span>
              )}
              <span className="flex items-center gap-1">
                <BikeIcon className="size-3.5" /> {formatCurrency(store.deliveryFee ?? 0)} delivery
              </span>
              <span>
                Min order {formatCurrency(store.minOrder ?? 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Products */}
        <div className="py-8">
          <h2 className="text-xl font-semibold text-app-green mb-5">
            Products ({products.length})
          </h2>

          {products.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-app-border">
              <p className="text-app-text-light">
                This store has no products available right now.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 xl:gap-8">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoreDetail;
