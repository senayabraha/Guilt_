import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeftIcon,
  CheckIcon,
  BanIcon,
  StoreIcon,
  MapPinIcon,
  PhoneIcon,
  MailIcon,
} from "lucide-react";
import toast from "react-hot-toast";

import Loading from "../../components/Loading";
import { statusColors } from "../../assets/assets";
import { getAdminStore, setStoreStatus } from "../../lib/db/stores";
import { formatCurrency } from "../../lib/format";

const storeStatusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  SUSPENDED: "bg-red-100 text-red-700",
};

export default function AdminStoreDetail() {
  const { id } = useParams();
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStore = async () => {
    if (!id) return;
    try {
      setStore(await getAdminStore(id));
    } catch (error: any) {
      toast.error(error?.message || "Failed to load store");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleApprove = async () => {
    if (!id) return;
    try {
      await setStoreStatus(id, "APPROVED");
      toast.success("Store approved");
      fetchStore();
    } catch (error: any) {
      toast.error(error?.message || "Failed to approve store");
    }
  };

  const handleSuspend = async () => {
    if (!id) return;
    if (!window.confirm("Suspend this store? Its products will be hidden."))
      return;
    try {
      await setStoreStatus(id, "SUSPENDED");
      toast.success("Store suspended");
      fetchStore();
    } catch (error: any) {
      toast.error(error?.message || "Failed to suspend store");
    }
  };

  if (loading) return <Loading />;
  if (!store) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-app-border p-6">
        <div className="flex items-center gap-4 mb-4">
          <Link
            to="/admin/stores"
            className="p-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-500 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="size-5" />
          </Link>
          <h2 className="text-xl font-semibold text-zinc-900">Store Details</h2>
        </div>

        {/* Cover image */}
        <div className="relative h-36 sm:h-44 rounded-xl overflow-hidden bg-app-cream mb-5 flex-center">
          {store.coverImage ? (
            <img
              src={store.coverImage}
              alt={`${store.name} cover`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-1 text-app-text-light">
              <StoreIcon className="size-7" />
              <span className="text-xs">No cover image</span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-5 items-start">
          <div className="size-16 rounded-xl bg-app-cream overflow-hidden flex-center shrink-0">
            {store.logo ? (
              <img
                src={store.logo}
                alt={store.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <StoreIcon className="size-7 text-app-green" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold text-app-green">
                {store.name}
              </h1>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${storeStatusColors[store.status] || "bg-zinc-100 text-zinc-600"}`}
              >
                {store.status}
              </span>
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
            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-xs text-app-text-light">
              <span className="flex items-center gap-1">
                <MapPinIcon className="size-3.5" /> {store.address},{" "}
                {store.city}, {store.state} {store.zip}
              </span>
              {store.phone && (
                <span className="flex items-center gap-1">
                  <PhoneIcon className="size-3.5" /> {store.phone}
                </span>
              )}
              {store.email && (
                <span className="flex items-center gap-1">
                  <MailIcon className="size-3.5" /> {store.email}
                </span>
              )}
            </div>

            {/* Categories */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {store.categories?.length ? (
                store.categories.map((c: string) => (
                  <span
                    key={c}
                    className="px-2 py-0.5 text-[10px] font-medium bg-orange-50 text-app-orange-dark rounded-full capitalize"
                  >
                    {c.replace(/-/g, " ")}
                  </span>
                ))
              ) : (
                <span className="text-xs text-app-text-light">
                  No categories
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            {store.status !== "APPROVED" && (
              <button
                onClick={handleApprove}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-app-green rounded-lg hover:bg-green-950 transition-colors"
              >
                <CheckIcon className="size-4" /> Approve
              </button>
            )}
            {store.status !== "SUSPENDED" && (
              <button
                onClick={handleSuspend}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                <BanIcon className="size-4" /> Suspend
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Owner + stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-app-border p-5">
          <p className="text-xs uppercase font-semibold text-zinc-400 mb-2">
            Owner
          </p>
          <p className="font-medium text-zinc-900">{store.owner?.name}</p>
          <p className="text-sm text-zinc-500">{store.owner?.email}</p>
          {store.owner?.phone && (
            <p className="text-sm text-zinc-500">{store.owner.phone}</p>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-app-border p-5">
          <p className="text-xs uppercase font-semibold text-zinc-400 mb-2">
            Products
          </p>
          <p className="text-2xl font-semibold text-zinc-900">
            {store._count?.products ?? store.products?.length ?? 0}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-app-border p-5">
          <p className="text-xs uppercase font-semibold text-zinc-400 mb-2">
            Orders
          </p>
          <p className="text-2xl font-semibold text-zinc-900">
            {store._count?.orders ?? store.orders?.length ?? 0}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Delivery fee {formatCurrency(store.deliveryFee ?? 0)} • Min{" "}
            {formatCurrency(store.minOrder ?? 0)}
          </p>
        </div>
      </div>

      {/* Products */}
      <div className="bg-white rounded-2xl border border-app-border overflow-hidden">
        <div className="px-6 py-4 border-b border-app-border">
          <h3 className="font-semibold text-zinc-900">Products</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-app-cream/50 text-zinc-500 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-3">Product</th>
                <th className="px-6 py-3">Price</th>
                <th className="px-6 py-3">Stock</th>
                <th className="px-6 py-3">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {(!store.products || store.products.length === 0) ? (
                <tr>
                  <td colSpan={4} className="px-6 py-6 text-center text-zinc-500">
                    No products.
                  </td>
                </tr>
              ) : (
                store.products.map((p: any) => (
                  <tr key={p.id}>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.image}
                          alt={p.name}
                          className="size-9 rounded-lg object-cover"
                        />
                        <span className="font-medium text-zinc-900">
                          {p.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      {formatCurrency(p.price)}
                    </td>
                    <td className="px-6 py-3">{p.stock ?? 0}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.isActive ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-600"}`}
                      >
                        {p.isActive ? "Yes" : "No"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-2xl border border-app-border overflow-hidden">
        <div className="px-6 py-4 border-b border-app-border">
          <h3 className="font-semibold text-zinc-900">Recent Orders</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-app-cream/50 text-zinc-500 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-3">Order</th>
                <th className="px-6 py-3">Total</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {(!store.orders || store.orders.length === 0) ? (
                <tr>
                  <td colSpan={4} className="px-6 py-6 text-center text-zinc-500">
                    No orders.
                  </td>
                </tr>
              ) : (
                store.orders.map((o: any) => (
                  <tr key={o.id}>
                    <td className="px-6 py-3 font-mono text-xs text-zinc-500">
                      #{o.id.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-6 py-3 font-medium">
                      {formatCurrency(o.total)}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[o.status] || "bg-zinc-100 text-zinc-600"}`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-zinc-500">
                      {new Date(o.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
