import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import api from "../config/api";
import { useAuth } from "../context/AuthContext";
import { ADDIS_SUBCITIES, isValidEthiopianPhone } from "../lib/addis";

const VendorRegister = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { applySession } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    storeName: "",
    subCity: "",
    address: "",
  });
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm({ ...form, [k]: v });
  const input = "w-full px-3 py-2 border border-app-border rounded-xl";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.phone && !isValidEthiopianPhone(form.phone)) {
      toast.error("Enter a valid Ethiopian phone number (e.g. 0911234567)");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register-vendor", form);
      applySession(data.user, data.token);
      toast.success("Store created — pending admin approval");
      navigate("/vendor");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-app-cream flex-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-app-green mb-1">{t("stores.becomeVendor")}</h1>
        <p className="text-sm text-app-text-light mb-6">
          Create your store. It goes live once an admin approves it.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder={t("common.name")}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className={input}
            required
          />
          <input
            type="email"
            placeholder={t("common.email")}
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            className={input}
            required
          />
          <input
            type="password"
            placeholder={t("common.password")}
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            className={input}
            required
          />
          <input
            type="tel"
            placeholder={`${t("common.phone")} (09...)`}
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            className={input}
          />
          <input
            type="text"
            placeholder={t("vendor.storeName")}
            value={form.storeName}
            onChange={(e) => set("storeName", e.target.value)}
            className={input}
            required
          />
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
            placeholder="Store address"
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            className={input}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-app-green text-white rounded-xl disabled:opacity-60"
          >
            {loading ? "Creating..." : t("vendor.register")}
          </button>
        </form>

        <p className="text-sm text-app-text-light mt-4 text-center">
          <Link to="/login" className="text-app-green hover:underline">
            {t("nav.signIn")}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default VendorRegister;
