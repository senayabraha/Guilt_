import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SearchIcon, StoreIcon, MapPinIcon, BikeIcon } from "lucide-react";
import toast from "react-hot-toast";

import type { Store } from "../types";
import Loading from "../components/Loading";
import api from "../config/api";

const Stores = () => {
  const currency = import.meta.env.VITE_CURRENCY_SYMBOL || "$";

  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");

  const fetchStores = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("search", query);
      const { data } = await api.get(`/stores?${params.toString()}`);
      setStores(data.stores);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to load stores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(search.trim());
  };

  return (
    <div className="min-h-screen bg-app-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold text-app-green flex items-center gap-2">
            <StoreIcon className="size-7" /> Browse Stores
          </h1>
          <p className="text-sm text-app-text-light mt-1">
            Shop from your favourite local stores
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="mb-8 max-w-md">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search stores by name or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white rounded-full ring ring-app-orange/15 focus:ring-app-orange/30 outline-none text-sm"
            />
          </div>
        </form>

        {loading ? (
          <Loading />
        ) : stores.length === 0 ? (
          <div className="text-center py-16">
            <StoreIcon className="size-12 text-app-text-light mx-auto mb-3" />
            <p className="text-lg font-semibold text-app-green mb-1">
              No stores found
            </p>
            <p className="text-sm text-app-text-light">
              Try a different search term
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {stores.map((store) => (
              <Link
                key={store.id}
                to={`/stores/${store.id}`}
                className="bg-white rounded-2xl overflow-hidden shadow hover:shadow-md transition-all duration-300 group animate-fade-in"
              >
                {/* Cover */}
                <div className="relative h-32 bg-app-green/10 overflow-hidden">
                  {store.coverImage ? (
                    <img
                      src={store.coverImage}
                      alt={store.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex-center text-app-green/30">
                      <StoreIcon className="size-10" />
                    </div>
                  )}
                  <span
                    className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-semibold ${store.isOpen ? "bg-green-100 text-green-700" : "bg-zinc-200 text-zinc-600"}`}
                  >
                    {store.isOpen ? "Open" : "Closed"}
                  </span>
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-center gap-3 -mt-8 mb-3">
                    <div className="size-14 rounded-xl bg-white border border-app-border overflow-hidden shrink-0 flex-center">
                      {store.logo ? (
                        <img
                          src={store.logo}
                          alt={store.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <StoreIcon className="size-6 text-app-green" />
                      )}
                    </div>
                  </div>

                  <h3 className="text-base font-semibold text-zinc-900 group-hover:text-app-green transition-colors">
                    {store.name}
                  </h3>

                  {store.categories?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {store.categories.slice(0, 3).map((c) => (
                        <span
                          key={c}
                          className="px-2 py-0.5 text-[10px] font-medium bg-orange-50 text-app-orange-dark rounded-full capitalize"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-app-text-light mt-3 flex items-center gap-1">
                    <MapPinIcon className="size-3" /> {store.city}, {store.state}
                  </p>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-app-border text-xs text-app-text-light">
                    <span className="flex items-center gap-1">
                      <BikeIcon className="size-3" /> {currency}
                      {(store.deliveryFee ?? 0).toFixed(2)} delivery
                    </span>
                    <span>
                      Min {currency}
                      {(store.minOrder ?? 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Stores;
