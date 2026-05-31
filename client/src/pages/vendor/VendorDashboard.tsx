import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import api from "../../config/api";
import type { Order, Store } from "../../types";
import { formatCurrency } from "../../lib/currency";
import Loading from "../../components/Loading";

interface VendorStats {
  totalOrders: number;
  totalProducts: number;
  outOfStock: number;
  recentOrders: Order[];
  store: Store;
}

const VendorDashboard = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get("/vendor/stats");
        setStats(data);
      } catch {
        toast.error("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <Loading />;
  if (!stats) return null;

  const cards = [
    { label: t("vendor.orders"), value: stats.totalOrders },
    { label: t("vendor.products"), value: stats.totalProducts },
    { label: "Out of stock", value: stats.outOfStock },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-app-green mb-1">{stats.store.name}</h1>
      <p className="text-app-text-light mb-6">{stats.store.subCity}</p>

      {!stats.store.isApproved && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 text-amber-800 text-sm">
          {t("vendor.pendingApproval")}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-2xl p-5">
            <p className="text-sm text-app-text-light">{c.label}</p>
            <p className="text-2xl font-bold text-app-green mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl overflow-hidden">
        <h2 className="p-4 font-semibold text-app-green border-b border-app-border">
          Recent Orders
        </h2>
        <table className="w-full text-sm">
          <thead className="bg-app-cream text-app-text-light">
            <tr>
              <th className="text-left p-3 font-medium">Order</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-right p-3 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {stats.recentOrders.map((o) => (
              <tr key={o.id} className="border-t border-app-border">
                <td className="p-3">#{o.id.slice(-6).toUpperCase()}</td>
                <td className="p-3">{o.status}</td>
                <td className="p-3 text-right">{formatCurrency(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VendorDashboard;
