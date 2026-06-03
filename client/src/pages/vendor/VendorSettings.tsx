import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { categoriesData } from "../../assets/assets";
import Loading from "../../components/Loading";
import ImageCropUpload from "../../components/ImageCropUpload";
import { getMyStore, updateMyStore } from "../../lib/db/stores";

const storeStatusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  SUSPENDED: "bg-red-100 text-red-700",
};

export default function VendorSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [storeId, setStoreId] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    logo: "",
    coverImage: "",
    deliveryRadius: "",
    deliveryFee: "",
    minOrder: "",
    isOpen: true,
  });

  useEffect(() => {
    const fetchStore = async () => {
      try {
        const s = await getMyStore();
        if (!s) {
          toast.error("No store found");
          return;
        }
        setStatus(s.status);
        setStoreId(s.id);
        setCategories(s.categories || []);
        setForm({
          name: s.name || "",
          description: s.description || "",
          phone: s.phone || "",
          email: s.email || "",
          address: s.address || "",
          city: s.city || "",
          state: s.state || "",
          zip: s.zip || "",
          logo: s.logo || "",
          coverImage: s.coverImage || "",
          deliveryRadius: (s.deliveryRadius ?? "").toString(),
          deliveryFee: (s.deliveryFee ?? "").toString(),
          minOrder: (s.minOrder ?? "").toString(),
          isOpen: s.isOpen ?? true,
        });
      } catch (error: any) {
        toast.error(error?.response?.data?.message || "No store found");
      } finally {
        setLoading(false);
      }
    };
    fetchStore();
  }, []);

  const update = (key: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleCategory = (slug: string) => {
    setCategories((prev) =>
      prev.includes(slug) ? prev.filter((c) => c !== slug) : [...prev, slug],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) return;
    setSaving(true);
    try {
      await updateMyStore(storeId, { ...form, categories });
      toast.success("Store settings updated");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update store");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  const inputClass =
    "w-full px-4 py-2.5 rounded-lg border border-zinc-200 focus:border-app-green focus:ring-1 focus:ring-app-green outline-none transition-all";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-app-border overflow-hidden">
      <div className="px-6 py-5 border-b border-app-border flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-semibold text-zinc-900">Store Settings</h2>
        {status && (
          <span
            className={`px-3 py-1.5 rounded-full text-xs font-semibold ${storeStatusColors[status] || "bg-zinc-100 text-zinc-600"}`}
          >
            {status}
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Store Name
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
              Address
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              City
            </label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              State
            </label>
            <input
              type="text"
              value={form.state}
              onChange={(e) => update("state", e.target.value)}
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
          <ImageCropUpload
            label="Store Logo"
            value={form.logo}
            aspect={1}
            recommendedSize="Recommended: 512×512 square image"
            previewClassName="aspect-square max-w-[220px]"
            onChange={(url) => update("logo", url)}
            onRemove={() => update("logo", "")}
          />
          <div className="md:col-span-2">
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
          <div className="flex items-center gap-3">
            <label
              htmlFor="isOpen"
              className="text-sm font-medium text-zinc-700 cursor-pointer"
            >
              Store Open (accepting orders)
            </label>
            <input
              type="checkbox"
              id="isOpen"
              checked={form.isOpen}
              onChange={(e) => update("isOpen", e.target.checked)}
              className="size-5 text-app-green rounded border-zinc-300 focus:ring-app-green cursor-pointer"
            />
          </div>
        </div>

        <div className="pt-6 border-t border-app-border flex justify-end">
          <button
            disabled={saving}
            type="submit"
            className="px-6 py-2.5 bg-app-orange text-white font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
