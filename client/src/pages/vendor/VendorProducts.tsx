import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import api from "../../config/api";
import type { Product } from "../../types";
import { formatCurrency } from "../../lib/currency";
import Loading from "../../components/Loading";

const VendorProducts = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    try {
      const { data } = await api.get("/vendor/products");
      setProducts(data.products);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Mark this product as out of stock?")) return;
    try {
      await api.delete(`/vendor/products/${id}`);
      toast.success("Product updated");
      fetchProducts();
    } catch {
      toast.error("Failed to update product");
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-app-green">{t("vendor.products")}</h1>
        <button
          onClick={() => navigate("/vendor/products/new")}
          className="flex items-center gap-2 px-4 py-2 bg-app-green text-white text-sm font-medium rounded-xl hover:bg-app-green-light"
        >
          <Plus className="size-4" /> {t("vendor.addProduct")}
        </button>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-app-cream text-app-text-light">
            <tr>
              <th className="text-left p-3 font-medium">Product</th>
              <th className="text-left p-3 font-medium">Category</th>
              <th className="text-left p-3 font-medium">Price</th>
              <th className="text-left p-3 font-medium">Stock</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-t border-app-border">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="size-10 rounded-lg object-cover"
                    />
                    <span className="font-medium text-app-text line-clamp-1">
                      {product.name}
                    </span>
                  </div>
                </td>
                <td className="p-3 text-app-text-light">{product.category}</td>
                <td className="p-3">{formatCurrency(product.price)}</td>
                <td className="p-3">{product.stock}</td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => navigate(`/vendor/products/${product.id}/edit`)}
                      className="p-2 text-app-text-light hover:text-app-green"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="p-2 text-app-text-light hover:text-app-error"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VendorProducts;
