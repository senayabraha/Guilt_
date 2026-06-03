import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PlusIcon, EditIcon, CheckIcon } from "lucide-react";
import toast from "react-hot-toast";

import type { Product } from "../../types";
import Loading from "../../components/Loading";
import { getMyStore } from "../../lib/db/stores";
import { getStoreProducts, updateProduct } from "../../lib/db/products";
import { formatCurrency } from "../../lib/format";

export default function VendorProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockEdits, setStockEdits] = useState<Record<string, string>>({});

  const fetchProducts = async () => {
    try {
      const store = await getMyStore();
      if (!store) {
        setProducts([]);
        return;
      }
      setProducts(await getStoreProducts(store.id));
    } catch (error: any) {
      toast.error(error?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const toggleActive = async (product: Product) => {
    try {
      await updateProduct(product.id || product._id, {
        isActive: !product.isActive,
      });
      toast.success(
        !product.isActive ? "Product activated" : "Product deactivated",
      );
      fetchProducts();
    } catch (error: any) {
      toast.error(error?.message || "Failed to update product");
    }
  };

  const saveStock = async (product: Product) => {
    const value = stockEdits[product.id || product._id];
    if (value === undefined) return;
    try {
      await updateProduct(product.id || product._id, { stock: Number(value) });
      toast.success("Stock updated");
      setStockEdits((prev) => {
        const next = { ...prev };
        delete next[product.id || product._id];
        return next;
      });
      fetchProducts();
    } catch (error: any) {
      toast.error(error?.message || "Failed to update stock");
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-app-border overflow-hidden">
      <div className="px-6 py-5 border-b border-app-border flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-xl font-semibold text-zinc-900">My Products</h2>
        <Link
          to="/vendor/products/new"
          className="flex items-center gap-2 px-4 py-2 bg-app-green text-white rounded-xl hover:bg-green-950 transition-colors font-medium text-sm"
        >
          <PlusIcon className="size-4" /> Add Product
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-app-cream/50 text-zinc-500 uppercase text-xs font-semibold">
            <tr>
              <th className="px-6 py-4">Product</th>
              <th className="px-6 py-4">Price</th>
              <th className="px-6 py-4">Stock</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {products.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                  No products yet. Add your first product.
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const pid = product.id || product._id;
                return (
                  <tr
                    key={pid}
                    className="hover:bg-zinc-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="size-12 rounded-lg object-cover"
                        />
                        <div>
                          <p className="font-semibold text-zinc-900">
                            {product.name}
                          </p>
                          <p className="text-xs text-zinc-500 capitalize">
                            {product.category || "Uncategorized"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {formatCurrency(product.price)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          value={stockEdits[pid] ?? String(product.stock ?? 0)}
                          onChange={(e) =>
                            setStockEdits((prev) => ({
                              ...prev,
                              [pid]: e.target.value,
                            }))
                          }
                          className="w-20 px-2 py-1 rounded-lg border border-zinc-200 focus:border-app-green outline-none text-sm"
                        />
                        {stockEdits[pid] !== undefined &&
                          stockEdits[pid] !== String(product.stock ?? 0) && (
                            <button
                              onClick={() => saveStock(product)}
                              title="Save stock"
                              className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                            >
                              <CheckIcon className="size-3.5" />
                            </button>
                          )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleActive(product)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${product.isActive ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
                      >
                        {product.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/vendor/products/${pid}/edit`}
                        className="inline-flex p-2 text-zinc-500 hover:text-app-orange bg-zinc-100 hover:bg-orange-50 rounded-lg transition-colors"
                      >
                        <EditIcon className="size-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
