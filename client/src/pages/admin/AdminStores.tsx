import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import api from "../../config/api";
import type { Store } from "../../types";
import { formatCurrency } from "../../lib/currency";
import Loading from "../../components/Loading";

interface AdminStore extends Store {
  owner?: { name: string; email: string; phone?: string };
}

const AdminStores = () => {
  const { t } = useTranslation();
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "active">("all");
  const [loading, setLoading] = useState(true);

  const fetchStores = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/stores?status=${filter}`);
      setStores(data.stores);
    } catch {
      toast.error("Failed to load stores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const approve = async (id: string, approved: boolean) => {
    try {
      await api.put(`/admin/stores/${id}/approve`, { approved });
      toast.success(approved ? "Store approved" : "Approval revoked");
      fetchStores();
    } catch {
      toast.error("Action failed");
    }
  };

  const setActive = async (id: string, isActive: boolean) => {
    try {
      await api.put(`/admin/stores/${id}/status`, { isActive });
      toast.success(isActive ? "Store activated" : "Store suspended");
      fetchStores();
    } catch {
      toast.error("Action failed");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-app-green">{t("admin.stores")}</h1>
        <div className="flex gap-2">
          {(["all", "pending", "active"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm capitalize ${
                filter === f ? "bg-app-green text-white" : "bg-white text-app-text-light"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <div className="bg-white rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-app-cream text-app-text-light">
              <tr>
                <th className="text-left p-3 font-medium">Store</th>
                <th className="text-left p-3 font-medium">Owner</th>
                <th className="text-left p-3 font-medium">Zone</th>
                <th className="text-left p-3 font-medium">Delivery</th>
                <th className="text-left p-3 font-medium">State</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((s) => (
                <tr key={s.id} className="border-t border-app-border">
                  <td className="p-3 font-medium text-app-text">{s.name}</td>
                  <td className="p-3 text-app-text-light">
                    {s.owner?.name}
                    <br />
                    <span className="text-xs">{s.owner?.email}</span>
                  </td>
                  <td className="p-3 text-app-text-light">{s.subCity || "—"}</td>
                  <td className="p-3 text-app-text-light">{formatCurrency(s.deliveryFee)}</td>
                  <td className="p-3">
                    {!s.isApproved ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs">
                        {t("admin.pending")}
                      </span>
                    ) : s.isActive ? (
                      <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">
                        {t("admin.active")}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs">
                        Suspended
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-2">
                      {!s.isApproved ? (
                        <button
                          onClick={() => approve(s.id, true)}
                          className="px-3 py-1.5 rounded-lg bg-app-green text-white text-xs"
                        >
                          {t("admin.approve")}
                        </button>
                      ) : s.isActive ? (
                        <button
                          onClick={() => setActive(s.id, false)}
                          className="px-3 py-1.5 rounded-lg bg-red-50 text-app-error text-xs"
                        >
                          {t("admin.suspend")}
                        </button>
                      ) : (
                        <button
                          onClick={() => setActive(s.id, true)}
                          className="px-3 py-1.5 rounded-lg bg-app-green text-white text-xs"
                        >
                          {t("admin.activate")}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {stores.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-app-text-light">
                    No stores found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminStores;
