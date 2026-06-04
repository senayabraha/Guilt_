import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPinIcon, SearchIcon, XIcon } from "lucide-react";
import toast from "react-hot-toast";

import LocationSelector from "../LocationSelector";
import MapPinPicker from "../MapPinPicker";
import { ADDIS_CENTER, getSavedPin, savePin } from "../../lib/areas";

interface Props {
  onPinChange?: (pin: { lat: number; lng: number }) => void;
}

// Prominent, marketplace-style search + delivery-location control.
const HomeSearch = ({ onPinChange }: Props) => {
  const [query, setQuery] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [hasPin, setHasPin] = useState(() => !!getSavedPin());
  const [draft, setDraft] = useState(() => getSavedPin() || ADDIS_CENTER);
  const navigate = useNavigate();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : "/products");
  };

  const saveLocation = () => {
    savePin(draft);
    setHasPin(true);
    setShowPin(false);
    onPinChange?.(draft);
    toast.success("Delivery location saved");
  };

  return (
    <section className="mb-6">
      <div className="bg-white rounded-2xl shadow-sm border border-app-border p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <LocationSelector />
          <button
            type="button"
            onClick={() => setShowPin(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-app-orange hover:text-app-orange-dark transition-colors shrink-0"
          >
            <MapPinIcon className="size-3.5" />
            {hasPin ? "Delivering near your saved pin" : "Set delivery location"}
          </button>
        </div>

        <form onSubmit={submit} className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-zinc-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products and stores"
              aria-label="Search products and stores"
              className="w-full pl-12 pr-4 py-3.5 sm:py-4 bg-app-cream/60 rounded-xl text-sm sm:text-base outline-none ring-1 ring-app-border focus:ring-2 focus:ring-app-orange/40 transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-5 sm:px-8 bg-app-orange text-white font-semibold rounded-xl hover:bg-app-orange-dark transition-colors active:scale-[0.98] flex-center gap-2 shrink-0"
          >
            <SearchIcon className="size-4 sm:hidden" />
            <span className="hidden sm:inline">Search</span>
          </button>
        </form>
      </div>

      {/* Delivery location modal */}
      {showPin && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-5 py-4 border-b border-app-border flex items-center justify-between">
              <h3 className="font-semibold text-app-green">
                Set delivery location
              </h3>
              <button
                type="button"
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
                helperText="Set your delivery pin to see nearby stores first."
              />
              <button
                type="button"
                onClick={saveLocation}
                className="mt-4 w-full py-3 bg-app-green text-white font-semibold rounded-xl hover:bg-app-green-light transition-colors"
              >
                Save delivery location
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default HomeSearch;
