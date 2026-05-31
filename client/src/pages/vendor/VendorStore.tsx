import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import api from "../../config/api";
import { ADDIS_SUBCITIES } from "../../lib/addis";
import Loading from "../../components/Loading";

interface StoreForm {
  name: string;
  description: string;
  phone: string;
  email: string;
  subCity: string;
  address: string;
  deliveryFee: string;
  minOrderAmount: string;
  taxRate: string;
  openingHours: string;
}

const VendorStore = () => {
  const { t } = useTranslation();
  const [form, setForm] = useState<StoreForm | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get("/vendor/store")
      .then(({ data }) => {
        const s = data.store;
        setForm({
          name: s.name || "",
          description: s.description || "",
          phone: s.phone || "",
          email: s.email || "",
          subCity: s.subCity || "",
          address: s.address || "",
          deliveryFee: String(s.deliveryFee ?? 0),
          minOrderAmount: String(s.minOrderAmount ?? 0),
          taxRate: String(s.taxRate ?? 0),
          openingHours: s.openingHours || "",
        });
      })
      .catch(() => toast.error("Failed to load store"));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      await api.put("/vendor/store", {
        ...form,
        deliveryFee: Number(form.deliveryFee),
        minOrderAmount: Number(form.minOrderAmount),
        taxRate: Number(form.taxRate),
      });
      toast.success("Store updated");
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!form) return <Loading />;

  const input = "w-full px-3 py-2 border border-app-border rounded-xl";
  const set = (k: keyof StoreForm, v: string) => setForm({ ...form, [k]: v });

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-app-green mb-6">{t("vendor.store")}</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 space-y-4">
        <input
          type="text"
          placeholder={t("vendor.storeName")}
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          className={input}
          required
        />
        <textarea
          placeholder="Description"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          className={input}
        />
        <div className="grid grid-cols-2 gap-4">
          <input
            type="tel"
            placeholder={t("common.phone")}
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            className={input}
          />
          <input
            type="email"
            placeholder={t("common.email")}
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            className={input}
          />
        </div>
        <select
          value={form.subCity}
          onChange={(e) => set("subCity", e.target.value)}
          className={input}
        >
          <option value="">{t("common.subCity")}</option>
          {ADDIS_SUBCITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Address"
          value={form.address}
          onChange={(e) => set("address", e.target.value)}
          className={input}
        />
        <div className="grid grid-cols-3 gap-4">
          <input
            type="number"
            placeholder="Delivery fee (Br)"
            value={form.deliveryFee}
            onChange={(e) => set("deliveryFee", e.target.value)}
            className={input}
          />
          <input
            type="number"
            placeholder="Min order (Br)"
            value={form.minOrderAmount}
            onChange={(e) => set("minOrderAmount", e.target.value)}
            className={input}
          />
          <input
            type="number"
            step="0.01"
            placeholder="Tax rate (0.15)"
            value={form.taxRate}
            onChange={(e) => set("taxRate", e.target.value)}
            className={input}
          />
        </div>
        <input
          type="text"
          placeholder="Opening hours (e.g. 8:00 - 21:00)"
          value={form.openingHours}
          onChange={(e) => set("openingHours", e.target.value)}
          className={input}
        />
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 bg-app-green text-white rounded-xl disabled:opacity-60"
        >
          {saving ? "Saving..." : t("vendor.saveStore")}
        </button>
      </form>
    </div>
  );
};

export default VendorStore;
