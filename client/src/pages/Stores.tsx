import { useEffect, useState } from "react";
import { SearchIcon, StoreIcon } from "lucide-react";
import toast from "react-hot-toast";

import type { Store } from "../types";
import Loading from "../components/Loading";
import StoreCard from "../components/StoreCard";
import { getPublicStores } from "../lib/db/stores";

const Stores = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");

  const fetchStores = async () => {
    setLoading(true);
    try {
      const data = await getPublicStores({ search: query });
      setStores(data);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load stores");
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
            <StoreIcon className="size-7" /> Browse stores
          </h1>
          <p className="text-sm text-app-text-light mt-1">
            Stores near you across Addis Ababa
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
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Stores;
