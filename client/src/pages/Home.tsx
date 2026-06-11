import { useEffect, useState } from "react";
import { XIcon } from "lucide-react";
import toast from "react-hot-toast";

import QuickTabs from "../components/Home/QuickTabs";
import FeaturedStores from "../components/Home/FeaturedStores";
import PromoBanners from "../components/Home/PromoBanners";
import HomeCategories from "../components/Home/HomeCategories";
import Features from "../components/Home/Features";
import MarketplaceCTAs from "../components/Home/MarketplaceCTAs";
import Newsletter from "../components/Home/Newsletter";
import PersonalizedSections from "../components/Home/PersonalizedSections";
import MapPinPicker from "../components/MapPinPicker";

import type { Store } from "../types";
import { getPublicStores } from "../lib/db/stores";
import { ADDIS_CENTER, getSavedPin, savePin, type SavedPin } from "../lib/areas";

const Home = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [storesLoading, setStoresLoading] = useState(true);
  const [pin, setPin] = useState<SavedPin | null>(() => getSavedPin());
  const [showPin, setShowPin] = useState(false);
  const [draft, setDraft] = useState(() => getSavedPin() || ADDIS_CENTER);

  useEffect(() => {
    getPublicStores()
      .then(setStores)
      .catch(() => setStores([]))
      .finally(() => setStoresLoading(false));
  }, []);

  const handleSetPin = () => setShowPin(true);

  const saveLocation = () => {
    savePin(draft);
    setPin(draft);
    setShowPin(false);
    toast.success("Location saved");
  };

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* Navigation tabs */}
      <QuickTabs />

      {/* Featured stores logo grid */}
      <FeaturedStores stores={stores} loading={storesLoading} pin={pin} />

      {/* Personalized sections — reorder, recently viewed, nearby, open now, popular, new */}
      <PersonalizedSections
        allStores={stores}
        pin={pin}
        onSetPin={handleSetPin}
      />

      {/* Rotating promotional banners */}
      <PromoBanners />

      {/* Shop by category */}
      <HomeCategories />

      {/* Trust badges */}
      <Features />

      {/* Store-owner & delivery partner CTAs */}
      <MarketplaceCTAs />

      {/* Newsletter */}
      <Newsletter />

      {/* Pin picker modal (triggered by PersonalizedSections or QuickTabs nearby) */}
      {showPin && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-5 py-4 border-b border-app-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-app-green">
                  Set your location pin
                </h3>
                <p className="text-xs text-app-text-light mt-0.5">
                  We'll show stores near this location.
                </p>
              </div>
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
                helperText="Drop a pin to discover stores near you."
              />
              <button
                type="button"
                onClick={saveLocation}
                className="mt-4 w-full py-3 bg-app-green text-white font-semibold rounded-xl hover:bg-app-green-light transition-colors"
              >
                Save location
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
