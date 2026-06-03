import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckIcon, BanIcon, EyeIcon, StoreIcon } from "lucide-react";
import toast from "react-hot-toast";

import type { Store } from "../../types";
import Loading from "../../components/Loading";
import api from "../../config/api";

const storeStatusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  SUSPENDED: "bg-red-100 text-red-700",
};

export default function AdminStores() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStores = async () => {
    try {
      const { data } = await api.get("/admin/stores");
      setStores(data.stores);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to load stores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await api.put(`/admin/stores/${id}/approve`);
      toast.success("Store approved");
      fetchStores();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to approve store");
    }
  };

  const handleSuspend = async (id: string) => {
    if (!window.confirm("Suspend this store? Its products will be hidden."))
      return;
    try {
      await api.put(`/admin/stores/${id}/suspend`);
      toast.success("Store suspended");
      fetchStores();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to suspend store");
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-app-border overflow-hidden">
      <div className="px-6 py-5 border-b border-app-border flex items-center gap-2">
        <StoreIcon className="size-5 text-app-green" />
        <h2 className="text-xl font-semibold text-zinc-900">Stores</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-app-cream/50 text-zinc-500 uppercase text-xs font-semibold">
            <tr>
              <th className="px-6 py-4">Store</th>
              <th className="px-6 py-4">Owner</th>
              <th className="px-6 py-4">Products</th>
              <th className="px-6 py-4">Orders</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {stores.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                  No stores yet.
                </td>
              </tr>
            ) : (
              stores.map((store) => (
                <tr
                  key={store.id}
                  className="hover:bg-zinc-50/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-lg bg-app-cream overflow-hidden flex-center shrink-0">
                        {store.logo ? (
                          <img
                            src={store.logo}
                            alt={store.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <StoreIcon className="size-5 text-app-green" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-zinc-900">
                          {store.name}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {store.city}, {store.state}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-zinc-900">
                      {store.owner?.name || "—"}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {store.owner?.email || ""}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-zinc-600">
                    {store._count?.products ?? 0}
                  </td>
                  <td className="px-6 py-4 text-zinc-600">
                    {store._count?.orders ?? 0}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${storeStatusColors[store.status] || "bg-zinc-100 text-zinc-600"}`}
                    >
                      {store.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {store.status !== "APPROVED" && (
                        <button
                          onClick={() => handleApprove(store.id)}
                          title="Approve"
                          className="p-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                        >
                          <CheckIcon className="size-4" />
                        </button>
                      )}
                      {store.status !== "SUSPENDED" && (
                        <button
                          onClick={() => handleSuspend(store.id)}
                          title="Suspend"
                          className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <BanIcon className="size-4" />
                        </button>
                      )}
                      <Link
                        to={`/admin/stores/${store.id}`}
                        title="View"
                        className="p-2 text-zinc-500 bg-zinc-100 hover:bg-orange-50 hover:text-app-orange rounded-lg transition-colors"
                      >
                        <EyeIcon className="size-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
