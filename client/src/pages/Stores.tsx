import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MapPin, Store as StoreIcon } from "lucide-react";
import api from "../config/api";
import type { Store } from "../types";
import Loading from "../components/Loading";

const Stores = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStores = async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/stores");
        setStores(data.stores);
      } catch {
        console.error("Failed to fetch stores");
      } finally {
        setLoading(false);
      }
    };
    fetchStores();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-app-green mb-1">Shop by store</h1>
      <p className="text-app-text-light mb-6">
        Pick a store to start shopping. Each order is fulfilled by a single store.
      </p>

      {loading ? (
        <Loading />
      ) : stores.length === 0 ? (
        <p className="text-app-text-light">No stores are available yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stores.map((store) => (
            <Link
              key={store.id}
              to={`/stores/${store.slug}`}
              className="bg-white rounded-2xl shadow hover:shadow-md transition-all p-5 flex gap-4 items-center"
            >
              {store.logo ? (
                <img
                  src={store.logo}
                  alt={store.name}
                  className="size-16 rounded-xl object-cover"
                />
              ) : (
                <div className="size-16 rounded-xl bg-app-cream flex-center">
                  <StoreIcon className="size-7 text-app-green" />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="font-semibold text-app-text line-clamp-1">
                  {store.name}
                </h3>
                {store.subCity && (
                  <p className="text-sm text-app-text-light flex items-center gap-1">
                    <MapPin className="size-4" /> {store.subCity}
                  </p>
                )}
                <p className="text-xs text-app-text-light mt-1">
                  {store.minOrderAmount > 0
                    ? `Min order ${store.minOrderAmount}`
                    : "No minimum order"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Stores;
