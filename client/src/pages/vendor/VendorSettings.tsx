import { useEffect, useState } from "react";
import { useParams, Navigate, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  StoreIcon,
  PhoneIcon,
  MapPinIcon,
  ImageIcon,
  TruckIcon,
  TagIcon,
} from "lucide-react";
import toast from "react-hot-toast";

import { categoriesData } from "../../assets/assets";
import Loading from "../../components/Loading";
import ImageCropUpload from "../../components/ImageCropUpload";
import MapPinPicker from "../../components/MapPinPicker";
import { ADDIS_AREAS } from "../../lib/areas";
import { getMyStoreById, updateMyStore } from "../../lib/db/stores";

const storeStatusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  SUSPENDED: "bg-red-100 text-red-700",
};

const storeStatusLabels: Record<string, string> = {
  PENDING: "Under Review",
  APPROVED: "Approved",
  SUSPENDED: "Suspended",
};

const SectionHeader = ({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
}) => (
  <div className="px-6 py-4 border-b border-app-border bg-app-cream/40">
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-app-green" />
      <h3 className="text-sm font-semibold text-zinc-800">{title}</h3>
    </div>
    {description && (
      <p className="text-xs text-app-text-light mt-0.5 ml-6">{description}</p>
    )}
  </div>
);

export default function VendorSettings() {
  const { storeId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [useCustomArea, setUseCustomArea] = useState(false);
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
    lat: 0,
    lng: 0,
  });

  useEffect(() => {
    if (!storeId) return;
    const fetchStore = async () => {
      try {
        const s = await getMyStoreById(storeId);
        if (!s) {
          setNotFound(true);
          return;
        }
        setStatus(s.status);
        setCategories(s.categories || []);
        const stateValue = s.state || "";
        const knownArea = ADDIS_AREAS.filter((a) => a !== "Addis Ababa").includes(stateValue as any);
        setUseCustomArea(!!stateValue && !knownArea);
        setForm({
          name: s.name || "",
          description: s.description || "",
          phone: s.phone || "",
          email: s.email || "",
          address: s.address || "",
          city: s.city || "",
          state: stateValue,
          zip: s.zip || "",
          logo: s.logo || "",
          coverImage: s.coverImage || "",
          deliveryRadius: (s.deliveryRadius ?? "").toString(),
          deliveryFee: (s.deliveryFee ?? "").toString(),
          minOrder: (s.minOrder ?? "").toString(),
          isOpen: s.isOpen ?? true,
          lat: s.lat ?? 0,
          lng: s.lng ?? 0,
        });
      } catch (error: any) {
        toast.error(error?.message || "No store found");
      } finally {
        setLoading(false);
      }
    };
    fetchStore();
  }, [storeId]);

  const update = (key: string, value: string | boolean | number) =>
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

  if (!storeId) return <Navigate to="/vendor" replace />;
  if (loading) return <Loading />;
  if (notFound) return <Navigate to="/vendor" replace />;

  const inputClass =
    "w-full px-4 py-2.5 rounded-lg border border-zinc-200 focus:border-app-green focus:ring-1 focus:ring-app-green outline-none transition-all text-sm";

  const isApproved = status === "APPROVED";
  const areaOptions = ADDIS_AREAS.filter((a) => a !== "Addis Ababa");

  return (
    <div className="space-y-4">
      <Link
        to={`/vendor/stores/${storeId}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-app-text-light hover:text-app-green transition-colors"
      >
        <ArrowLeftIcon className="size-4" /> Store dashboard
      </Link>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Store Settings</h1>
          <p className="text-xs text-app-text-light mt-0.5">
            Changes take effect immediately after saving.
          </p>
        </div>
        {status && (
          <span
            className={`px-3 py-1.5 rounded-full text-xs font-semibold ${storeStatusColors[status] || "bg-zinc-100 text-zinc-600"}`}
          >
            {storeStatusLabels[status] || status}
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ── Store Status ─────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-app-border overflow-hidden">
          <SectionHeader
            icon={StoreIcon}
            title="Store Status"
            description="Control whether your store is currently accepting orders"
          />
          <div className="p-6">
            <div
              className={`flex items-center justify-between gap-4 p-4 rounded-xl border ${
                isApproved
                  ? form.isOpen
                    ? "border-app-green/30 bg-green-50"
                    : "border-zinc-200 bg-zinc-50"
                  : "border-amber-200 bg-amber-50"
              }`}
            >
              <div>
                <p className="text-sm font-semibold text-zinc-800">
                  {isApproved
                    ? form.isOpen
                      ? "Store is Open"
                      : "Store is Closed"
                    : "Store not yet approved"}
                </p>
                <p className="text-xs text-app-text-light mt-0.5">
                  {isApproved
                    ? form.isOpen
                      ? "Customers can browse products and place orders."
                      : "Customers see your store but cannot place new orders."
                    : "Your store must be approved before you can go live."}
                </p>
              </div>
              <button
                type="button"
                disabled={!isApproved}
                onClick={() => update("isOpen", !form.isOpen)}
                role="switch"
                aria-checked={form.isOpen}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-app-green/30 shrink-0 ${
                  form.isOpen ? "bg-app-green" : "bg-zinc-300"
                }`}
              >
                <span
                  className={`inline-block size-5 bg-white rounded-full shadow-sm transition-transform ${
                    form.isOpen ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* ── Profile ──────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-app-border overflow-hidden">
          <SectionHeader
            icon={StoreIcon}
            title="Store Profile"
            description="Your public-facing store name and description"
          />
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                Store Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                Description
              </label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                className={`${inputClass} resize-none`}
                placeholder="Tell customers about your store…"
              />
            </div>
          </div>
        </div>

        {/* ── Contact ──────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-app-border overflow-hidden">
          <SectionHeader
            icon={PhoneIcon}
            title="Contact Information"
          />
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                Phone
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                className={inputClass}
                placeholder="+251…"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* ── Location ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-app-border overflow-hidden">
          <SectionHeader
            icon={MapPinIcon}
            title="Location"
            description="Helps customers and delivery partners find your store"
          />
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Addis Ababa"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Sub-city / Area
                </label>
                {useCustomArea ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={form.state}
                      onChange={(e) => update("state", e.target.value)}
                      className={inputClass}
                      placeholder="Enter area name"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setUseCustomArea(false);
                        update("state", "");
                      }}
                      className="px-3 text-xs text-app-text-light hover:text-zinc-700 border border-zinc-200 rounded-lg shrink-0"
                    >
                      List
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <select
                      value={form.state}
                      onChange={(e) => update("state", e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select sub-city…</option>
                      {areaOptions.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setUseCustomArea(true);
                        update("state", "");
                      }}
                      className="px-3 text-xs text-app-text-light hover:text-zinc-700 border border-zinc-200 rounded-lg shrink-0"
                    >
                      Other
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                Street / Pickup Address
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                className={inputClass}
                placeholder="Building name, landmark, etc."
              />
            </div>
            <MapPinPicker
              label="Store pickup pin"
              lat={form.lat}
              lng={form.lng}
              onChange={(c) =>
                setForm((prev) => ({ ...prev, lat: c.lat, lng: c.lng }))
              }
              helperText="Pin your exact pickup location to help delivery partners find you."
            />
          </div>
        </div>

        {/* ── Branding ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-app-border overflow-hidden">
          <SectionHeader
            icon={ImageIcon}
            title="Branding"
            description="Logo and cover image shown to customers"
          />
          <div className="p-6 space-y-6">
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
              label="Cover Image"
              value={form.coverImage}
              aspect={16 / 9}
              recommendedSize="Recommended: 1200×500 wide banner"
              previewClassName="aspect-video"
              onChange={(url) => update("coverImage", url)}
              onRemove={() => update("coverImage", "")}
            />
          </div>
        </div>

        {/* ── Delivery ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-app-border overflow-hidden">
          <SectionHeader
            icon={TruckIcon}
            title="Delivery Settings"
            description="Fees and radius used when customers checkout"
          />
          <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                Delivery Radius (km)
              </label>
              <input
                type="number"
                min="0"
                value={form.deliveryRadius}
                onChange={(e) => update("deliveryRadius", e.target.value)}
                className={inputClass}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                Delivery Fee (ETB)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.deliveryFee}
                onChange={(e) => update("deliveryFee", e.target.value)}
                className={inputClass}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                Minimum Order (ETB)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.minOrder}
                onChange={(e) => update("minOrder", e.target.value)}
                className={inputClass}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* ── Categories ───────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-app-border overflow-hidden">
          <SectionHeader
            icon={TagIcon}
            title="Categories"
            description="Help customers discover your store"
          />
          <div className="p-6">
            <div className="flex flex-wrap gap-2">
              {categoriesData.map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => toggleCategory(c.slug)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    categories.includes(c.slug)
                      ? "bg-app-green text-white border-app-green"
                      : "bg-white text-zinc-600 border-app-border hover:bg-app-cream"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Actions ──────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(`/vendor/stores/${storeId}`)}
            className="px-5 py-2.5 text-sm font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={saving}
            type="submit"
            className="px-6 py-2.5 bg-app-orange text-white text-sm font-semibold rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving && (
              <span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            )}
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
