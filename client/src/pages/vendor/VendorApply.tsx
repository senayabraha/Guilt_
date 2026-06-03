import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { StoreIcon } from "lucide-react";
import toast from "react-hot-toast";

import { categoriesData } from "../../assets/assets";
import { useAuth } from "../../context/AuthContext";
import { applyForStore } from "../../lib/db/stores";
import { becomeVendor } from "../../lib/db/profiles";

interface Props {
  /** Render without the page wrapper (e.g. embedded on the dashboard). */
  embedded?: boolean;
  onApplied?: () => void;
}

export default function VendorApply({ embedded, onApplied }: Props) {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    phone: "",
    email: "",
    logo: "",
    coverImage: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    deliveryRadius: "5",
    deliveryFee: "1.99",
    minOrder: "0",
  });
  const [categories, setCategories] = useState<string[]>([]);

  const update = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleCategory = (slug: string) => {
    setCategories((prev) =>
      prev.includes(slug) ? prev.filter((c) => c !== slug) : [...prev, slug],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.address || !form.city || !form.state) {
      toast.error("Store name, address, city, and state are required");
      return;
    }
    if (!user) return;
    setSaving(true);
    try {
      await applyForStore({ ...form, categories }, user.id || user._id);
      // Applying promotes the user from CUSTOMER to VENDOR.
      await becomeVendor(user.id || user._id);
      updateUser({ role: "VENDOR" });
      toast.success("Application submitted! Your store is pending approval.");
      onApplied?.();
      navigate("/vendor");
    } catch (error: any) {
      toast.error(error?.message || "Failed to submit application");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full px-4 py-2.5 rounded-lg border border-zinc-200 focus:border-app-green focus:ring-1 focus:ring-app-green outline-none transition-all";

  const formContent = (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Store Name *
          </label>
          <input
            required
            type="text"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Description
          </label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            className={`${inputClass} resize-none`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Phone
          </label>
          <input
            type="text"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Email
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Address *
          </label>
          <input
            required
            type="text"
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
            placeholder="e.g. Bole Medhanialem, near Edna Mall"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            City *
          </label>
          <input
            required
            type="text"
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
            placeholder="Addis Ababa"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Sub-city / Area *
          </label>
          <input
            required
            type="text"
            value={form.state}
            onChange={(e) => update("state", e.target.value)}
            placeholder="e.g. Bole, Kazanchis, Piassa, CMC, Megenagna"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Zip
          </label>
          <input
            type="text"
            value={form.zip}
            onChange={(e) => update("zip", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Logo URL
          </label>
          <input
            type="text"
            value={form.logo}
            onChange={(e) => update("logo", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Cover Image URL
          </label>
          <input
            type="text"
            value={form.coverImage}
            onChange={(e) => update("coverImage", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Delivery Radius (km)
          </label>
          <input
            type="number"
            min="0"
            value={form.deliveryRadius}
            onChange={(e) => update("deliveryRadius", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Delivery Fee ($)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.deliveryFee}
            onChange={(e) => update("deliveryFee", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Minimum Order ($)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.minOrder}
            onChange={(e) => update("minOrder", e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Categories
          </label>
          <div className="flex flex-wrap gap-2">
            {categoriesData.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => toggleCategory(c.slug)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${categories.includes(c.slug) ? "bg-app-green text-white border-app-green" : "bg-white text-zinc-600 border-app-border hover:bg-app-cream"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-app-border flex justify-end">
        <button
          disabled={saving}
          type="submit"
          className="px-6 py-2.5 bg-app-orange text-white font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
        >
          {saving ? "Submitting..." : "Submit Application"}
        </button>
      </div>
    </form>
  );

  const card = (
    <div className="bg-white rounded-2xl shadow-sm border border-app-border overflow-hidden">
      <div className="px-6 py-5 border-b border-app-border flex items-center gap-3">
        <StoreIcon className="size-5 text-app-green" />
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">
            Open Your Store
          </h2>
          <p className="text-xs text-app-text-light">
            List your store on Zembil Market. An admin will review your
            application.
          </p>
        </div>
      </div>
      {formContent}
    </div>
  );

  if (embedded) return card;

  return (
    <div className="min-h-screen bg-app-cream">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{card}</div>
    </div>
  );
}
