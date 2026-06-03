import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { StoreIcon } from "lucide-react";
import toast from "react-hot-toast";

import { categoriesData } from "../../assets/assets";
import { ADDIS_AREAS } from "../../lib/areas";
import { useAuth } from "../../context/AuthContext";
import { applyForStore, getMyStore } from "../../lib/db/stores";
import { becomeVendor } from "../../lib/db/profiles";
import ImageCropUpload from "../../components/ImageCropUpload";

interface Props {
  /** Render without the page wrapper (e.g. embedded on the dashboard). */
  embedded?: boolean;
  onApplied?: () => void;
}

export default function VendorApply({ embedded, onApplied }: Props) {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [saving, setSaving] = useState(false);
  const [areaOther, setAreaOther] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    phone: "",
    email: "",
    logo: "",
    coverImage: "",
    address: "",
    city: "Addis Ababa",
    state: "",
    zip: "",
    deliveryRadius: "5",
    deliveryFee: "50",
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

  const canSubmit =
    Boolean(user) &&
    Boolean(form.name.trim()) &&
    Boolean(form.address.trim()) &&
    Boolean(form.city.trim()) &&
    Boolean(form.state.trim()) &&
    !saving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please log in before applying for a store.");
      return;
    }
    if (!form.name.trim()) {
      toast.error("Store name is required.");
      return;
    }
    if (!form.phone.trim()) {
      toast.error("Phone number is required.");
      return;
    }
    if (!form.address.trim() || !form.city.trim() || !form.state.trim()) {
      toast.error("Address, city, and sub-city / area are required.");
      return;
    }
    if (categories.length === 0) {
      toast.error("Select at least one category.");
      return;
    }

    setSaving(true);
    try {
      // One vendor = one store application for now.
      const existing = await getMyStore();
      if (existing) {
        toast.error("You already have a store application.");
        onApplied?.();
        navigate("/vendor");
        return;
      }

      const payload = {
        ...form,
        email: form.email.trim() || user.email,
        categories,
      };
      await applyForStore(payload, user.id || user._id);
      // Applying promotes the user from CUSTOMER to VENDOR.
      await becomeVendor(user.id || user._id);
      updateUser({ role: "VENDOR" });
      toast.success("Application submitted! Your store is pending approval.");
      onApplied?.();
      navigate("/vendor");
    } catch (error: any) {
      console.error("Store application failed:", error);
      toast.error(error?.message || "Failed to submit application");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full px-4 py-2.5 rounded-lg border border-zinc-200 focus:border-app-green focus:ring-1 focus:ring-app-green outline-none transition-all";
  const sectionTitle = "text-sm font-semibold text-app-green";

  const formContent = (
    <form onSubmit={handleSubmit} className="p-6 space-y-8">
      {/* Store information */}
      <section className="space-y-4">
        <h3 className={sectionTitle}>Store information</h3>
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
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Categories *
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
      </section>

      {/* Contact information */}
      <section className="space-y-4">
        <h3 className={sectionTitle}>Contact information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Phone *
            </label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="+251 ..."
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
              placeholder={user?.email || "you@example.com"}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Location */}
      <section className="space-y-4">
        <h3 className={sectionTitle}>Location</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <select
              value={areaOther ? "Other" : form.state}
              onChange={(e) => {
                if (e.target.value === "Other") {
                  setAreaOther(true);
                  update("state", "");
                } else {
                  setAreaOther(false);
                  update("state", e.target.value);
                }
              }}
              className={inputClass}
            >
              <option value="" disabled>
                Select area
              </option>
              {ADDIS_AREAS.filter((a) => a !== "Addis Ababa").map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
              <option value="Other">Other</option>
            </select>
            {areaOther && (
              <input
                type="text"
                value={form.state}
                onChange={(e) => update("state", e.target.value)}
                placeholder="Enter your area"
                className={`${inputClass} mt-2`}
              />
            )}
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
        </div>
      </section>

      {/* Store branding */}
      <section className="space-y-4">
        <h3 className={sectionTitle}>Store branding</h3>
        <p className="text-xs text-app-text-light -mt-2">
          You can update your logo and cover image later from Store Settings.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ImageCropUpload
            label="Store Logo"
            value={form.logo}
            aspect={1}
            recommendedSize="Recommended: 512×512 square image"
            previewClassName="aspect-square max-w-[220px]"
            onChange={(url) => update("logo", url)}
            onRemove={() => update("logo", "")}
          />
          <ImageCropUpload
            label="Store Cover Image"
            value={form.coverImage}
            aspect={16 / 9}
            recommendedSize="Recommended: 1200×500 wide banner"
            previewClassName="aspect-video"
            onChange={(url) => update("coverImage", url)}
            onRemove={() => update("coverImage", "")}
          />
        </div>
      </section>

      {/* Delivery settings */}
      <section className="space-y-4">
        <h3 className={sectionTitle}>Delivery settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              Delivery Fee (ETB)
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
              Minimum Order (ETB)
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
        </div>
      </section>

      <div className="pt-6 border-t border-app-border">
        <p className="text-xs text-app-text-light mb-3">
          Your store will be reviewed by Zembil Market admin before products can
          go live.
        </p>
        {!user && (
          <p className="text-sm text-app-error mb-3">
            Please log in before submitting a store application.
          </p>
        )}
        <div className="flex justify-end">
          <button
            disabled={!canSubmit}
            type="submit"
            className="px-6 py-2.5 bg-app-orange text-white font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Submitting..." : "Submit Application"}
          </button>
        </div>
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
