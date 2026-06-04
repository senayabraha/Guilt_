import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "lucide-react";
import toast from "react-hot-toast";

import { categoriesData } from "../../assets/assets";
import Loading from "../../components/Loading";
import MultiImageUpload from "../../components/MultiImageUpload";
import { getMyStore } from "../../lib/db/stores";
import { getStoreProducts, createProduct, updateProduct } from "../../lib/db/products";

export default function VendorProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    specifications: "",
    price: "",
    originalPrice: "",
    image: "",
    category: "",
    unit: "",
    stock: "",
    isOrganic: false,
    isActive: true,
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!isEdit) return;
      try {
        const store = await getMyStore();
        const products = store ? await getStoreProducts(store.id) : [];
        const p = products.find((prod) => prod.id === id || prod._id === id);
        if (!p) {
          toast.error("Product not found");
          navigate("/vendor/products");
          return;
        }
        setFormData({
          name: p.name,
          description: p.description || "",
          specifications: p.specifications || "",
          price: p.price.toString(),
          originalPrice: p.originalPrice ? p.originalPrice.toString() : "",
          image: p.image,
          category: p.category,
          unit: p.unit || "",
          stock: (p.stock ?? 0).toString(),
          isOrganic: Boolean(p.isOrganic),
          isActive: p.isActive ?? true,
        });
        setImages(p.images && p.images.length ? p.images : p.image ? [p.image] : []);
      } catch (error: any) {
        toast.error(error?.response?.data?.message || "Failed to load product");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, isEdit, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (!images.length) {
        toast.error("Please upload at least one product image");
        setSaving(false);
        return;
      }

      const payload = {
        name: formData.name,
        description: formData.description,
        specifications: formData.specifications,
        category: formData.category,
        unit: formData.unit,
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
        // store_id is never passed on update.
        await updateProduct(id, payload);
        toast.success("Product updated successfully");
      } else {
        const store = await getMyStore();
        if (!store) {
          toast.error("You need an approved store before adding products");
          setSaving(false);
          return;
        }
        await createProduct(payload, store.id);
        toast.success("Product created successfully");
      }
      navigate("/vendor/products");
    } catch (error: any) {
      toast.error(error?.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full px-4 py-2.5 rounded-lg border border-zinc-200 focus:border-app-green focus:ring-1 focus:ring-app-green outline-none transition-all";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-app-border overflow-hidden">
      <div className="px-6 py-5 border-b border-app-border flex items-center gap-4">
        <Link
          to="/vendor/products"
          className="p-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-500 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="size-5" />
        </Link>
        <h2 className="text-xl font-semibold text-zinc-900">
          {isEdit ? "Edit Product" : "New Product"}
        </h2>
      </div>
      {loading ? (
        <Loading />
      ) : (
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Name
              </label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Category
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
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
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Price (ETB)
              </label>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Original Price (ETB) - Optional
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.originalPrice}
                onChange={(e) =>
                  setFormData({ ...formData, originalPrice: e.target.value })
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Unit
              </label>
              <input
                required
                type="text"
                placeholder="e.g., kg, piece, liter"
                value={formData.unit}
                onChange={(e) =>
                  setFormData({ ...formData, unit: e.target.value })
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Stock
              </label>
              <input
                required
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) =>
                  setFormData({ ...formData, stock: e.target.value })
                }
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Product Images
              </label>
              <MultiImageUpload images={images} onChange={setImages} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Description
              </label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className={`${inputClass} resize-none`}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Specifications
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Weight: 1kg • Origin: Ethiopia • Storage: keep refrigerated"
                value={formData.specifications}
                onChange={(e) =>
                  setFormData({ ...formData, specifications: e.target.value })
                }
                className={`${inputClass} resize-none`}
              />
            </div>
            <div className="flex items-center gap-3">
              <label
                htmlFor="isOrganic"
                className="text-sm font-medium text-zinc-700 cursor-pointer"
              >
                Organic
              </label>
              <input
                type="checkbox"
                id="isOrganic"
                checked={formData.isOrganic}
                onChange={(e) =>
                  setFormData({ ...formData, isOrganic: e.target.checked })
                }
                className="size-5 text-app-green rounded border-zinc-300 focus:ring-app-green cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-3">
              <label
                htmlFor="isActive"
                className="text-sm font-medium text-zinc-700 cursor-pointer"
              >
                Active (visible to customers)
              </label>
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
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
              {saving ? "Saving..." : "Save Product"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
