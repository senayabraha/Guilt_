import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { CheckIcon, BanIcon, EyeIcon, StoreIcon } from "lucide-react";
import toast from "react-hot-toast";

import type { Store } from "../../types";
import Loading from "../../components/Loading";
import { getAllStores, setStoreStatus } from "../../lib/db/stores";

const STORE_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  SUSPENDED: "bg-red-100 text-red-700",
};

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "SUSPENDED", label: "Suspended" },
];

export default function AdminStores() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [confirmSuspend, setConfirmSuspend] = useState<string | null>(null);

  const fetchStores = async () => {
    try {
      setStores(await getAllStores());
    } catch (error: any) {
      toast.error(error?.message || "Failed to load stores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const pendingCount = useMemo(
    () => stores.filter((s) => s.status === "PENDING").length,
    [stores],
  );

  const displayed = useMemo(() => {
    const list =
      filterStatus === "all"
        ? stores
        : stores.filter((s) => s.status === filterStatus);
    return [...list].sort((a, b) => {
      if (a.status === "PENDING" && b.status !== "PENDING") return -1;
      if (a.status !== "PENDING" && b.status === "PENDING") return 1;
      return 0;
    });
  }, [stores, filterStatus]);

  const handleApprove = async (id: string) => {
    try {
      await setStoreStatus(id, "APPROVED");
      toast.success("Store approved");
      setStores((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: "APPROVED" as const } : s)),
      );
    } catch (error: any) {
      toast.error(error?.message || "Failed to approve");
    }
  };

  const handleSuspend = async (id: string) => {
    try {
      await setStoreStatus(id, "SUSPENDED");
      toast.success("Store suspended");
      setStores((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: "SUSPENDED" as const } : s)),
      );
    } catch (error: any) {
      toast.error(error?.message || "Failed to suspend");
    } finally {
      setConfirmSuspend(null);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <StoreIcon className="size-5 text-app-green" />
        <h1 className="text-xl font-semibold text-zinc-900 flex-1">Stores</h1>
        {pendingCount > 0 && (
          <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full animate-pulse">
            {pendingCount} pending
          </span>
        )}
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
        {STATUS_FILTERS.map((f) => (
          <button
            type="button"
            key={f.value}
            onClick={() => setFilterStatus(f.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              filterStatus === f.value
                ? "bg-app-green text-white"
                : "bg-white border border-app-border text-zinc-500 hover:bg-zinc-50"
            }`}
          >
            {f.label}
            {f.value !== "all" && (
              <span className="ml-1 opacity-70">
                ({stores.filter((s) => s.status === f.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-app-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-app-cream/50 text-zinc-500 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">Store</th>
                <th className="px-6 py-4 hidden sm:table-cell">Owner</th>
                <th className="px-6 py-4 hidden md:table-cell">Products</th>
                <th className="px-6 py-4 hidden md:table-cell">Orders</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {displayed.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-zinc-500"
                  >
                    No stores found.
                  </td>
                </tr>
              ) : (
                displayed.map((store) => (
                  <tr
                    key={store.id}
                    className={`hover:bg-zinc-50/50 transition-colors ${store.status === "PENDING" ? "bg-amber-50/40" : ""}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-lg bg-app-cream overflow-hidden flex items-center justify-center shrink-0">
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
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <p className="font-medium text-zinc-900">
                        {store.owner?.name || "—"}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {store.owner?.email || ""}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-zinc-600 hidden md:table-cell">
                      {store._count?.products ?? 0}
                    </td>
                    <td className="px-6 py-4 text-zinc-600 hidden md:table-cell">
                      {store._count?.orders ?? 0}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STORE_STATUS_COLORS[store.status] || "bg-zinc-100 text-zinc-600"}`}
                      >
                        {store.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {confirmSuspend === store.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-red-600 font-medium">
                            Suspend?
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSuspend(store.id)}
                            className="px-2.5 py-1 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmSuspend(null)}
                            className="px-2.5 py-1 text-xs font-medium text-zinc-600 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          {store.status !== "APPROVED" && (
                            <button
                              type="button"
                              onClick={() => handleApprove(store.id)}
                              title="Approve"
                              aria-label={`Approve ${store.name}`}
                              className="p-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                            >
                              <CheckIcon className="size-4" />
                            </button>
                          )}
                          {store.status !== "SUSPENDED" && (
                            <button
                              type="button"
                              onClick={() => setConfirmSuspend(store.id)}
                              title="Suspend"
                              aria-label={`Suspend ${store.name}`}
                              className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                            >
                              <BanIcon className="size-4" />
                            </button>
                          )}
                          <Link
                            to={`/admin/stores/${store.id}`}
                            title="View"
                            aria-label={`View ${store.name}`}
                            className="p-2 text-zinc-500 bg-zinc-100 hover:bg-orange-50 hover:text-app-orange rounded-lg transition-colors"
                          >
                            <EyeIcon className="size-4" />
                          </Link>
                        </div>
                      )}
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
