import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ClockIcon, PlusIcon, EditIcon, CheckIcon, PackageIcon } from "lucide-react";
import toast from "react-hot-toast";

import type { Product } from "../../types";
import Loading from "../../components/Loading";
import StatusState from "../../components/StatusState";
import { getMyVendorProducts } from "../../lib/db/vendorProducts";
import { getMyStores } from "../../lib/db/stores";
import { updateProduct } from "../../lib/db/products";
import { formatCurrency } from "../../lib/format";

export default function VendorProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasApprovedStore, setHasApprovedStore] = useState(true);
  const [stockEdits, setStockEdits] = useState<Record<string, string>>({});
  const [searchParams] = useSearchParams();
  const [filter, setFilter] = useState<string>(
    () => searchParams.get("store") || "all",
  );

  const fetchProducts = async () => {
    try {
      const [myProducts, myStores] = await Promise.all([
        getMyVendorProducts(),
        getMyStores(),
      ]);
      setProducts(myProducts);
      setHasApprovedStore(myStores.some((s) => s.status === "APPROVED"));
    } catch (error: any) {
      toast.error(error?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Distinct stores found among the products, for the filter pills.
  const stores = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of products) {
      const id = p.store?.id || p.storeId;
      if (id && !map.has(id)) map.set(id, p.store?.name || "Store");
    }
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [products]);

  const visibleProducts = useMemo(
    () =>
      filter === "all"
        ? products
        : products.filter((p) => (p.store?.id || p.storeId) === filter),
    [products, filter],
  );

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
      {/* Banner for vendors without an approved store */}
      {!hasApprovedStore && (
        <div className="flex items-start gap-3 px-6 py-4 bg-amber-50 border-b border-amber-200 text-amber-800 text-sm">
          <ClockIcon className="size-4 shrink-0 mt-0.5" />
          <p>
            Your store is pending admin approval. Product management will be
            available once your store is approved.{" "}
            <Link to="/vendor" className="font-medium underline">
              Check store status →
            </Link>
          </p>
        </div>
      )}
      <div className="px-6 py-5 border-b border-app-border flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-xl font-semibold text-zinc-900">Products</h2>
        <Link
          to="/vendor/products/new"
          className="flex items-center gap-2 px-4 py-2 bg-app-green text-white rounded-xl hover:bg-green-950 transition-colors font-medium text-sm"
        >
          <PlusIcon className="size-4" /> Add Product
        </Link>
      </div>
      {stores.length > 0 && (
        <div className="px-6 py-4 border-b border-app-border flex gap-2 flex-wrap overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${filter === "all" ? "bg-app-green text-white border-app-green" : "bg-white text-zinc-600 border-app-border hover:bg-app-cream"}`}
          >
            All stores
          </button>
          {stores.map((s) => (
            <button
              type="button"
              key={s.id}
              onClick={() => setFilter(s.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${filter === s.id ? "bg-app-green text-white border-app-green" : "bg-white text-zinc-600 border-app-border hover:bg-app-cream"}`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-app-cream/50 text-zinc-500 uppercase text-xs font-semibold">
            <tr>
              <th className="px-6 py-4">Product</th>
              <th className="px-6 py-4">Store</th>
              <th className="px-6 py-4">Price</th>
              <th className="px-6 py-4">Stock</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {visibleProducts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8">
                  <StatusState
                    icon={PackageIcon}
                    title={filter === "all" ? "No products yet" : "No products for this store"}
                    description="Add your first product with images, pricing, stock, and visibility settings."
                    className="border-dashed"
                    action={
                      hasApprovedStore ? (
                        <Link
                          to="/vendor/products/new"
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-app-green px-5 py-2.5 text-sm font-semibold text-white hover:bg-app-green-light"
                        >
                          <PlusIcon className="size-4" />
                          Add Product
                        </Link>
                      ) : null
                    }
                  />
                </td>
              </tr>
            ) : (
              visibleProducts.map((product) => {
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
                    <td className="px-6 py-4 text-zinc-600">
                      {product.store?.name || "—"}
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
                              type="button"
                              onClick={() => saveStock(product)}
                              title="Save stock"
                              aria-label={`Save stock for ${product.name}`}
                              className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                            >
                              <CheckIcon className="size-3.5" />
                            </button>
                          )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
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
                        aria-label={`Edit ${product.name}`}
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
