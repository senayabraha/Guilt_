import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../config/api";
import { categoriesData } from "../../assets/assets";

interface FormState {
  name: string;
  description: string;
  price: string;
  originalPrice: string;
  image: string;
  category: string;
  unit: string;
  stock: string;
  isOrganic: boolean;
}

const empty: FormState = {
  name: "",
  description: "",
  price: "",
  originalPrice: "",
  image: "",
  category: "",
  unit: "",
  stock: "",
  isOrganic: false,
};

const VendorProductForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [form, setForm] = useState<FormState>(empty);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isEdit) {
      api
        .get(`/products/${id}`)
        .then(({ data }) => {
          const p = data.product;
          setForm({
            name: p.name || "",
            description: p.description || "",
            price: String(p.price ?? ""),
            originalPrice: String(p.originalPrice ?? ""),
            image: p.image || "",
            category: p.category || "",
            unit: p.unit || "",
            stock: String(p.stock ?? ""),
            isOrganic: Boolean(p.isOrganic),
          });
        })
        .catch(() => toast.error("Failed to load product"));
    }
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const payload = {
      ...form,
      price: Number(form.price),
      originalPrice: Number(form.originalPrice || form.price),
      stock: Number(form.stock),
    };
    try {
      if (isEdit) {
        await api.put(`/vendor/products/${id}`, payload);
        toast.success("Product updated");
      } else {
        await api.post("/vendor/products", payload);
        toast.success("Product created");
      }
      navigate("/vendor/products");
    } catch {
      toast.error("Save failed");
    } finally {
      setLoading(false);
    }
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("image", file);
    try {
      const { data } = await api.post("/upload", fd);
      setForm((f) => ({ ...f, image: data.url }));
      toast.success("Image uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const input = "w-full px-3 py-2 border border-app-border rounded-xl";

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-app-green mb-6">
        {isEdit ? "Edit" : "Add"} Product
      </h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 space-y-4">
        <input
          type="text"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={input}
          required
        />
        <textarea
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className={input}
        />
        <div className="grid grid-cols-2 gap-4">
          <input
            type="number"
            placeholder="Price (Br)"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className={input}
            required
          />
          <input
            type="number"
            placeholder="Original price (Br)"
            value={form.originalPrice}
            onChange={(e) => setForm({ ...form, originalPrice: e.target.value })}
            className={input}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className={input}
            required
          >
            <option value="">Select category</option>
            {categoriesData.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Unit (e.g. 1kg)"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
            className={input}
          />
        </div>
        <input
          type="number"
          placeholder="Stock"
          value={form.stock}
          onChange={(e) => setForm({ ...form, stock: e.target.value })}
          className={input}
          required
        />
        <div className="flex items-center gap-3">
          <input type="file" accept="image/*" onChange={handleImage} />
          {form.image && (
            <img src={form.image} alt="preview" className="size-12 rounded-lg object-cover" />
          )}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isOrganic}
            onChange={(e) => setForm({ ...form, isOrganic: e.target.checked })}
          />
          Organic
        </label>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || uploading}
            className="px-5 py-2.5 bg-app-green text-white rounded-xl disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/vendor/products")}
            className="px-5 py-2.5 border border-app-border rounded-xl"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default VendorProductForm;
