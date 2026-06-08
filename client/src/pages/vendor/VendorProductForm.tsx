import { useState, useEffect } from "react";
import {
  useParams,
  useSearchParams,
  Link,
  useNavigate,
} from "react-router-dom";
import { ArrowLeftIcon, LeafIcon } from "lucide-react";
import toast from "react-hot-toast";

import { categoriesData } from "../../assets/assets";
import Loading from "../../components/Loading";
import MultiImageUpload from "../../components/MultiImageUpload";
import type { Store } from "../../types";
import { getMyStores } from "../../lib/db/stores";
import { getProduct, updateProduct } from "../../lib/db/products";
import { createVendorProductForStores } from "../../lib/db/vendorProducts";
import { formatCurrency } from "../../lib/format";

const MAX_IMAGES = 8;

// Common units shown as datalist suggestions (free-text field).
const UNIT_SUGGESTIONS = [
  "kg", "g", "liter", "ml", "piece", "pack",
  "dozen", "bunch", "box", "bottle", "bag", "crate",
];

export default function VendorProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [editStoreName, setEditStoreName] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    specifications: "",
    price: "",
    originalPrice: "",
    category: "",
    unit: "",
    stock: "",
    isOrganic: false,
    isActive: true,
  });

  const set = (key: string, value: any) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  // Live discount preview
  const priceNum = Number(formData.price);
  const origNum = Number(formData.originalPrice);
  const discountPct =
    formData.originalPrice && origNum > priceNum && priceNum > 0
      ? Math.round(((origNum - priceNum) / origNum) * 100)
      : 0;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const myStores = await getMyStores();
        setStores(myStores);

        if (!isEdit) {
          const storeParam = searchParams.get("store");
          if (storeParam) {
            const match = myStores.find(
              (s) => s.id === storeParam && s.status === "APPROVED",
            );
            if (match) setSelectedStores([match.id]);
          }
          return;
        }

        const p = await getProduct(id!);
        if (!p) {
          toast.error("Product not found.");
          navigate("/vendor/products");
          return;
        }
        setFormData({
          name: p.name,
          description: p.description || "",
          specifications: p.specifications || "",
          price: p.price.toString(),
          originalPrice: p.originalPrice ? p.originalPrice.toString() : "",
          category: p.category,
          unit: p.unit || "",
          stock: (p.stock ?? 0).toString(),
          isOrganic: Boolean(p.isOrganic),
          isActive: p.isActive ?? true,
        });
        setImages(
          p.images && p.images.length ? p.images : p.image ? [p.image] : [],
        );
        setEditStoreName(p.store?.name || "");
      } catch {
        toast.error("Failed to load product.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, isEdit, navigate, searchParams]);

  const validate = (): string | null => {
    if (!formData.name.trim()) return "Product name is required.";
    if (!formData.category) return "Please select a category.";
    if (!formData.unit.trim()) return "Unit is required (e.g. kg, piece).";
    if (!formData.price || Number(formData.price) <= 0)
      return "Selling price must be greater than 0.";
    if (
      formData.originalPrice &&
      Number(formData.originalPrice) <= Number(formData.price)
    )
      return "Original price must be higher than the selling price — it's the crossed-out was-price shown to customers.";
    const stockNum = Number(formData.stock);
    if (
      formData.stock === "" ||
      isNaN(stockNum) ||
      stockNum < 0 ||
      !Number.isInteger(stockNum)
    )
      return "Stock must be a whole number (0 or more).";
    if (!images.length)
      return "Add at least one product image before saving.";
    if (!isEdit && selectedStores.length === 0)
      return "Select at least one approved store to publish this product.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        specifications: formData.specifications.trim(),
        category: formData.category,
        unit: formData.unit.trim(),
        image: images[0],
        images,
        price: Number(formData.price),
        originalPrice: formData.originalPrice
          ? Number(formData.originalPrice)
          : 0,
        stock: Number(formData.stock),
        isOrganic: formData.isOrganic,
        isActive: formData.isActive,
      };

      if (isEdit && id) {
        await updateProduct(id, payload);
        toast.success("Product updated successfully.");
      } else {
        await createVendorProductForStores(payload, selectedStores);
        toast.success(
          `Product published to ${selectedStores.length} store${selectedStores.length !== 1 ? "s" : ""}.`,
        );
      }
      navigate("/vendor/products");
    } catch (error: any) {
      toast.error(error?.message || "Failed to save product — please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full px-4 py-2.5 rounded-lg border border-zinc-200 focus:border-app-green focus:ring-1 focus:ring-app-green outline-none transition-all text-sm";
  const sectionTitle =
    "text-sm font-semibold text-app-green mb-4";

  const approvedStores = stores.filter((s) => s.status === "APPROVED");

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-app-border overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-app-border flex items-center gap-4">
        <Link
          to="/vendor/products"
          className="p-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-500 rounded-lg transition-colors shrink-0"
        >
          <ArrowLeftIcon className="size-5" />
        </Link>
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">
            {isEdit ? "Edit Product" : "New Product"}
          </h2>
          {isEdit && editStoreName && (
            <p className="text-xs text-app-text-light mt-0.5">
              Editing for{" "}
              <span className="font-medium text-zinc-700">{editStoreName}</span>{" "}
              — changes apply to this store only
            </p>
          )}
          {isEdit && !editStoreName && (
            <p className="text-xs text-app-text-light mt-0.5">
              Changes apply to this store only
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <form onSubmit={handleSubmit} className="divide-y divide-app-border">

          {/* ── Store assignment (new products only) ── */}
          {!isEdit && (
            <section className="p-6">
              <h3 className={sectionTitle}>Assign to Stores</h3>
              {approvedStores.length === 0 ? (
                <div className="rounded-lg bg-zinc-50 border border-app-border px-4 py-3 text-sm text-zinc-600">
                  You need at least one approved store before adding products.{" "}
                  <Link
                    to="/vendor/apply"
                    className="text-app-green font-medium hover:underline"
                  >
                    Apply for a store →
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {stores.map((store) => {
                    const isApproved = store.status === "APPROVED";
                    const checked = selectedStores.includes(store.id);
                    return (
                      <label
                        key={store.id}
                        htmlFor={`store-${store.id}`}
                        className={`flex items-start gap-3 rounded-lg border px-4 py-3 transition-colors ${
                          !isApproved
                            ? "border-zinc-100 opacity-60 cursor-not-allowed"
                            : checked
                              ? "border-app-green bg-app-green/5 cursor-pointer"
                              : "border-app-border cursor-pointer hover:border-app-green"
                        }`}
                      >
                        <input
                          type="checkbox"
                          id={`store-${store.id}`}
                          disabled={!isApproved}
                          checked={checked}
                          onChange={(e) => {
                            setSelectedStores((prev) =>
                              e.target.checked
                                ? [...prev, store.id]
                                : prev.filter((sid) => sid !== store.id),
                            );
                          }}
                          className="mt-0.5 size-4 text-app-green rounded border-zinc-300 focus:ring-app-green disabled:cursor-not-allowed"
                        />
                        <span>
                          <span
                            className={`block text-sm font-medium ${isApproved ? "text-zinc-800" : "text-zinc-400"}`}
                          >
                            {store.name}
                          </span>
                          <span className="block text-xs text-zinc-400 mt-0.5">
                            {isApproved
                              ? [store.city, store.state]
                                  .filter(Boolean)
                                  .join(", ") || "No location set"
                              : store.status === "PENDING"
                                ? "Pending approval — cannot add products yet"
                                : "Store suspended — cannot add products"}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* ── Images ── */}
          <section className="p-6">
            <h3 className={sectionTitle}>Product Images</h3>
            <MultiImageUpload
              images={images}
              onChange={setImages}
              maxImages={MAX_IMAGES}
            />
          </section>

          {/* ── Basic Info ── */}
          <section className="p-6 space-y-4">
            <h3 className={sectionTitle}>Basic Info</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Product Name <span className="text-app-error">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Fresh Ethiopian Tomatoes"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Category <span className="text-app-error">*</span>
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => set("category", e.target.value)}
                  className={`${inputClass} bg-white`}
                >
                  <option value="">Select a category</option>
                  {categoriesData.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Unit <span className="text-app-error">*</span>
                </label>
                <input
                  required
                  type="text"
                  list="unit-suggestions"
                  placeholder="e.g. kg, piece, liter"
                  value={formData.unit}
                  onChange={(e) => set("unit", e.target.value)}
                  className={inputClass}
                />
                <datalist id="unit-suggestions">
                  {UNIT_SUGGESTIONS.map((u) => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
              </div>
            </div>
          </section>

          {/* ── Pricing ── */}
          <section className="p-6 space-y-4">
            <h3 className={sectionTitle}>Pricing</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Selling Price (ETB) <span className="text-app-error">*</span>
                </label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.price}
                  onChange={(e) => set("price", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Original Price (ETB)
                  <span className="text-zinc-400 font-normal ml-1 text-xs">
                    optional — shown crossed-out
                  </span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.originalPrice}
                  onChange={(e) => set("originalPrice", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Discount preview */}
            {discountPct > 0 && (
              <div className="flex items-center gap-2.5 text-sm bg-orange-50 border border-orange-100 rounded-lg px-4 py-2.5">
                <span className="px-2 py-0.5 bg-app-orange text-white text-xs font-bold rounded-full shrink-0">
                  {discountPct}% OFF
                </span>
                <span className="text-zinc-600">
                  Customers will see{" "}
                  <span className="line-through text-zinc-400">
                    {formatCurrency(origNum)}
                  </span>{" "}
                  crossed out with{" "}
                  <span className="font-semibold text-zinc-800">
                    {formatCurrency(priceNum)}
                  </span>{" "}
                  as the price.
                </span>
              </div>
            )}
          </section>

          {/* ── Inventory ── */}
          <section className="p-6 space-y-4">
            <h3 className={sectionTitle}>Inventory</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Stock Quantity <span className="text-app-error">*</span>
                </label>
                <input
                  required
                  type="number"
                  min="0"
                  step="1"
                  value={formData.stock}
                  onChange={(e) => set("stock", e.target.value)}
                  className={inputClass}
                />
                <p className="text-xs text-app-text-light mt-1">
                  Set to 0 to show as out of stock.
                </p>
              </div>
              <div className="flex flex-col justify-center gap-2">
                <p className="text-sm font-medium text-zinc-700">
                  Organic product?
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.isOrganic}
                    onClick={() => set("isOrganic", !formData.isOrganic)}
                    className={`w-10 h-5 rounded-full flex items-center transition-colors px-0.5 shrink-0 ${
                      formData.isOrganic ? "bg-green-600" : "bg-zinc-200"
                    }`}
                  >
                    <div
                      className={`size-4 rounded-full bg-white shadow-sm transition-transform ${
                        formData.isOrganic ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <span className="flex items-center gap-1.5 text-sm text-app-text-light">
                    <LeafIcon className="size-3.5 text-green-600" />
                    {formData.isOrganic
                      ? "Organic — badge shown on card"
                      : "Not organic"}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* ── Description & Specifications ── */}
          <section className="p-6 space-y-4">
            <h3 className={sectionTitle}>Description & Specifications</h3>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                Description
              </label>
              <textarea
                rows={4}
                placeholder="Describe your product — what it is, where it's from, how to use it…"
                value={formData.description}
                onChange={(e) => set("description", e.target.value)}
                maxLength={2000}
                className={`${inputClass} resize-none`}
              />
              <p className="text-xs text-app-text-light mt-1">
                {formData.description.length}/2000 characters
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                Specifications
                <span className="text-zinc-400 font-normal ml-1 text-xs">
                  optional
                </span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Weight: 1 kg · Origin: Oromia · Storage: keep refrigerated below 4 °C"
                value={formData.specifications}
                onChange={(e) => set("specifications", e.target.value)}
                maxLength={1000}
                className={`${inputClass} resize-none`}
              />
              <p className="text-xs text-app-text-light mt-1">
                {formData.specifications.length}/1000 characters
              </p>
            </div>
          </section>

          {/* ── Visibility / Publish ── */}
          <section className="p-6">
            <h3 className={sectionTitle}>Visibility</h3>
            <div className="flex items-start gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={formData.isActive}
                onClick={() => set("isActive", !formData.isActive)}
                className={`mt-0.5 w-10 h-5 rounded-full flex items-center transition-colors px-0.5 shrink-0 ${
                  formData.isActive ? "bg-app-green" : "bg-zinc-200"
                }`}
              >
                <div
                  className={`size-4 rounded-full bg-white shadow-sm transition-transform ${
                    formData.isActive ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <div>
                <p className="text-sm font-medium text-zinc-700">
                  {formData.isActive
                    ? "Active — visible to customers"
                    : "Inactive — hidden from customers"}
                </p>
                <p className="text-xs text-app-text-light mt-0.5">
                  {formData.isActive
                    ? "This product will appear in your store and search results."
                    : "This product is saved as a draft. Turn it on when you're ready to sell."}
                </p>
              </div>
            </div>
          </section>

          {/* ── Actions ── */}
          <div className="px-6 py-5 flex items-center justify-between gap-3 bg-zinc-50/60">
            <button
              type="button"
              onClick={() => navigate("/vendor/products")}
              className="px-5 py-2.5 text-sm font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || (!isEdit && approvedStores.length === 0)}
              className="px-6 py-2.5 bg-app-orange text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Saving…
                </>
              ) : isEdit ? (
                "Update Product"
              ) : (
                "Publish Product"
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
