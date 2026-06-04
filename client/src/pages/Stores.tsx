import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MapPinIcon, NavigationIcon, SearchIcon, StoreIcon, XIcon } from "lucide-react";
import toast from "react-hot-toast";

import type { Store } from "../types";
import Loading from "../components/Loading";
import StoreCard from "../components/StoreCard";
import MapPinPicker from "../components/MapPinPicker";
import { getPublicStores } from "../lib/db/stores";
import { ADDIS_CENTER, getSavedPin, savePin, type SavedPin } from "../lib/areas";
import { sortStoresByDistance } from "../lib/geo";

const Stores = () => {
  const [searchParams] = useSearchParams();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [nearby, setNearby] = useState(searchParams.get("nearby") === "1");
  const [pin, setPin] = useState<SavedPin | null>(() => getSavedPin());
  const [showPin, setShowPin] = useState(false);
  const [draft, setDraft] = useState(() => getSavedPin() || ADDIS_CENTER);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(search.trim());
  };

  const saveLocation = () => {
    savePin(draft);
    setPin(draft);
    setShowPin(false);
    toast.success("Delivery location saved");
  };

  const displayed = nearby && pin ? sortStoresByDistance(stores, pin) : stores;

  return (
    <div className="min-h-screen bg-app-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold text-app-green flex items-center gap-2">
            <StoreIcon className="size-7" /> Browse stores
          </h1>
          <p className="text-sm text-app-text-light mt-1">
            Stores near you across Addis Ababa
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setNearby(false)}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${!nearby ? "bg-app-green text-white" : "bg-white text-app-text-light border border-app-border"}`}
          >
            All stores
          </button>
          <button
            onClick={() => setNearby(true)}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-colors flex items-center gap-1.5 ${nearby ? "bg-app-green text-white" : "bg-white text-app-text-light border border-app-border"}`}
          >
            <NavigationIcon className="size-3.5" /> Nearby
          </button>
          {pin && (
            <button
              onClick={() => setShowPin(true)}
              className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-app-orange hover:text-app-orange-dark"
            >
              <MapPinIcon className="size-3.5" /> Update pin
            </button>
          )}
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

        {/* Nearby prompt when no pin */}
        {nearby && !pin && (
          <div className="rounded-2xl border border-dashed border-app-border bg-white px-5 py-8 text-center mb-8">
            <NavigationIcon className="size-8 text-app-green/50 mx-auto mb-3" />
            <p className="text-sm font-semibold text-app-green">
              Set your delivery location to see nearby stores.
            </p>
            <button
              onClick={() => setShowPin(true)}
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-app-green text-white text-sm font-semibold hover:bg-app-green-light transition-colors"
            >
              <MapPinIcon className="size-4" /> Set delivery location
            </button>
          </div>
        )}

        {loading ? (
          <Loading />
        ) : displayed.length === 0 ? (
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
            {displayed.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        )}
      </div>

      {/* Pin modal */}
      {showPin && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-5 py-4 border-b border-app-border flex items-center justify-between">
              <h3 className="font-semibold text-app-green">
                Set delivery location
              </h3>
              <button
                onClick={() => setShowPin(false)}
                className="p-1.5 rounded-lg hover:bg-app-cream transition-colors"
              >
                <XIcon className="size-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto">
              <MapPinPicker
                lat={draft.lat}
                lng={draft.lng}
                onChange={(c) => setDraft(c)}
                helperText="Set your delivery pin to sort stores by distance."
              />
              <button
                onClick={saveLocation}
                className="mt-4 w-full py-3 bg-app-green text-white font-semibold rounded-xl hover:bg-app-green-light transition-colors"
              >
                Save delivery location
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stores;
