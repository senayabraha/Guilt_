import { Link } from "react-router-dom";
import { ArrowRightIcon, BikeIcon, StoreIcon } from "lucide-react";

// Vendor + delivery-partner calls to action for the two-sided marketplace.
const MarketplaceCTAs = () => {
  return (
    <section className="py-10 grid grid-cols-1 md:grid-cols-2 gap-5">
      {/* Vendor */}
      <div className="bg-app-green rounded-3xl p-7 sm:p-8 text-white flex flex-col">
        <div className="size-12 rounded-2xl bg-white/10 flex-center mb-5">
          <StoreIcon className="size-6 text-orange-300" />
        </div>
        <h3 className="text-2xl font-semibold mb-2">Own a store in Addis?</h3>
        <p className="text-white/70 text-sm leading-relaxed max-w-md mb-6">
          Bring your products online with Zembil Market. Manage products,
          orders, and customers from your Store Dashboard.
        </p>
        <Link
          to="/vendor/apply"
          className="mt-auto inline-flex items-center gap-2 px-6 py-3 bg-orange-400 text-white font-semibold rounded-full hover:bg-orange-500 transition-colors w-fit active:scale-[0.98]"
        >
          Apply as Store Owner <ArrowRightIcon className="size-4" />
        </Link>
      </div>

      {/* Delivery */}
      <div className="bg-app-cream border border-app-border rounded-3xl p-7 sm:p-8 flex flex-col">
        <div className="size-12 rounded-2xl bg-app-green/10 flex-center mb-5">
          <BikeIcon className="size-6 text-app-green" />
        </div>
        <h3 className="text-2xl font-semibold text-app-green mb-2">
          Deliver with Zembil Market
        </h3>
        <p className="text-app-text-light text-sm leading-relaxed max-w-md mb-6">
          Help local stores reach customers across Addis Ababa and manage
          deliveries from your Delivery Partner dashboard.
        </p>
        <Link
          to="/delivery"
          className="mt-auto inline-flex items-center gap-2 px-6 py-3 bg-app-green text-white font-semibold rounded-full hover:bg-app-green-light transition-colors w-fit active:scale-[0.98]"
        >
          Go to Delivery Partner <ArrowRightIcon className="size-4" />
        </Link>
      </div>
    </section>
  );
};

export default MarketplaceCTAs;
