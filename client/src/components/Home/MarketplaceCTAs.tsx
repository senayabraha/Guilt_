import { Link } from "react-router-dom";
import { BikeIcon, StoreIcon } from "lucide-react";

// Compact, lower-priority CTAs for store owners and delivery partners. Kept
// small so they don't distract from customer shopping. Side by side on mobile.
const MarketplaceCTAs = () => {
  return (
    <section className="grid grid-cols-2 gap-3 mb-10">
      {/* Store owner */}
      <div className="bg-app-green rounded-2xl p-4 text-white flex flex-col">
        <div className="size-9 rounded-xl bg-white/10 flex-center mb-3">
          <StoreIcon className="size-5 text-orange-300" />
        </div>
        <h3 className="text-sm font-semibold mb-1">Own a store in Addis?</h3>
        <p className="text-white/70 text-xs leading-relaxed mb-3">
          Bring your products online with Zembil Market.
        </p>
        <Link
          to="/vendor/apply"
          className="mt-auto inline-flex justify-center px-4 py-2 bg-orange-400 text-white text-xs font-semibold rounded-full hover:bg-orange-500 transition-colors active:scale-[0.98]"
        >
          Apply
        </Link>
      </div>

      {/* Delivery partner */}
      <div className="bg-app-cream border border-app-border rounded-2xl p-4 flex flex-col">
        <div className="size-9 rounded-xl bg-app-green/10 flex-center mb-3">
          <BikeIcon className="size-5 text-app-green" />
        </div>
        <h3 className="text-sm font-semibold text-app-green mb-1">
          Deliver with Zembil
        </h3>
        <p className="text-app-text-light text-xs leading-relaxed mb-3">
          Help local stores reach customers.
        </p>
        <Link
          to="/delivery"
          className="mt-auto inline-flex justify-center px-4 py-2 bg-app-green text-white text-xs font-semibold rounded-full hover:bg-app-green-light transition-colors active:scale-[0.98]"
        >
          Delivery Partner
        </Link>
      </div>
    </section>
  );
};

export default MarketplaceCTAs;
