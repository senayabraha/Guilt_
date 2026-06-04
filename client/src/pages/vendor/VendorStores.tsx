import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  PlusIcon,
  SettingsIcon,
  ShoppingBagIcon,
  StoreIcon,
} from "lucide-react";
import toast from "react-hot-toast";

import type { Store } from "../../types";
import Loading from "../../components/Loading";
import { getMyStores } from "../../lib/db/stores";

const storeStatusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  SUSPENDED: "bg-red-100 text-red-700",
};

// Vendor landing page: every store/branch the vendor owns.
export default function VendorStores() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyStores()
      .then(setStores)
      .catch((error: any) =>
        toast.error(error?.message || "Failed to load your stores"),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  if (stores.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-app-border p-8 text-center">
        <div className="size-14 rounded-2xl bg-app-green/10 flex-center mx-auto mb-4 text-app-green">
          <StoreIcon className="size-7" />
        </div>
        <h1 className="text-xl font-semibold text-app-green">
          Open your first store
        </h1>
        <p className="text-sm text-app-text-light mt-1 max-w-md mx-auto">
          You don't have any stores yet. Open a store to start selling on Zembil
          Market.
        </p>
        <Link
          to="/vendor/apply"
          className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-app-green text-white text-sm font-semibold hover:bg-app-green-light transition-colors"
        >
          <PlusIcon className="size-4" /> Open your first store
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-app-green">My Stores</h1>
          <p className="text-sm text-app-text-light mt-1">
            Manage each of your stores and branches.
          </p>
        </div>
        <Link
          to="/vendor/apply"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-app-green text-white text-sm font-semibold hover:bg-app-green-light transition-colors"
        >
          <PlusIcon className="size-4" /> Add another store
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {stores.map((store) => (
          <div
            key={store.id}
            className="bg-white rounded-2xl border border-app-border overflow-hidden flex flex-col"
          >
            <div className="p-5 flex items-start gap-3">
              <div className="size-14 rounded-xl bg-app-cream overflow-hidden flex-center shrink-0">
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
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-zinc-900 truncate">
                  {store.name}
                </h2>
                <p className="text-xs text-app-text-light truncate">
                  {[store.state, store.city].filter(Boolean).join(", ")}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${storeStatusColors[store.status] || "bg-zinc-100 text-zinc-600"}`}
                  >
                    {store.status}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${store.isOpen ? "bg-green-100 text-green-700" : "bg-zinc-200 text-zinc-600"}`}
                  >
                    {store.isOpen ? "Open" : "Closed"}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-5 pb-4 flex items-center gap-4 text-xs text-app-text-light">
              <span>
                <span className="font-semibold text-zinc-900">
                  {store._count?.products ?? 0}
                </span>{" "}
                products
              </span>
              {typeof store._count?.orders === "number" && (
                <span>
                  <span className="font-semibold text-zinc-900">
                    {store._count.orders}
                  </span>{" "}
                  orders
                </span>
              )}
            </div>

            <div className="mt-auto border-t border-app-border grid grid-cols-3 divide-x divide-app-border">
              <Link
                to={`/vendor/stores/${store.id}`}
                className="py-3 text-center text-xs font-medium text-app-green hover:bg-app-cream transition-colors"
              >
                Manage Store
              </Link>
              <Link
                to={`/vendor/stores/${store.id}/orders`}
                className="py-3 text-center text-xs font-medium text-zinc-600 hover:bg-app-cream transition-colors flex items-center justify-center gap-1"
              >
                <ShoppingBagIcon className="size-3.5" /> Orders
              </Link>
              <Link
                to={`/vendor/stores/${store.id}/settings`}
                className="py-3 text-center text-xs font-medium text-zinc-600 hover:bg-app-cream transition-colors flex items-center justify-center gap-1"
              >
                <SettingsIcon className="size-3.5" /> Settings
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
