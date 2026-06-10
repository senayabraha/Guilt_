import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { PlusIcon, EditIcon, XIcon, SearchIcon, PackageIcon } from "lucide-react";
import toast from "react-hot-toast";

import type { Product } from "../../types";
import Loading from "../../components/Loading";
import StatusState from "../../components/StatusState";
import { getAllProducts, deactivateProduct } from "../../lib/db/products";
import { formatCurrency } from "../../lib/format";

const STOCK_FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "In Stock" },
  { value: "inactive", label: "Out of Stock" },
];

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [confirmDeactivate, setConfirmDeactivate] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      setProducts(await getAllProducts());
    } catch (error: any) {
      toast.error(error?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filtered = useMemo(() => {
    let list = products;
    if (stockFilter === "active")
      list = list.filter((p) => p.stock > 0 && p.isActive);
    else if (stockFilter === "inactive")
      list = list.filter((p) => !p.isActive || p.stock === 0);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.category || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [products, stockFilter, search]);

  const handleDeactivate = async (id: string) => {
    try {
      await deactivateProduct(id);
      toast.success("Product marked as out of stock");
      setProducts((prev) =>
        prev.map((p) =>
          (p.id === id || p._id === id) ? { ...p, isActive: false, stock: 0 } : p,
        ),
      );
    } catch (error: any) {
      toast.error(error?.message || "Failed to update product");
    } finally {
      setConfirmDeactivate(null);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-4">
      {/* Header + search */}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-semibold text-zinc-900 flex-1">Products</h1>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search name or category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm rounded-xl border border-app-border focus:border-app-green outline-none w-52"
          />
        </div>
        <Link
          to="/admin/products/new"
          className="flex items-center gap-2 px-4 py-2 bg-app-green text-white rounded-xl hover:bg-green-950 transition-colors font-medium text-sm shrink-0"
        >
          <PlusIcon className="size-4" /> Add Product
        </Link>
      </div>

      {/* Stock filter tabs */}
      <div className="flex gap-1.5">
        {STOCK_FILTERS.map((f) => (
          <button
            type="button"
            key={f.value}
            onClick={() => setStockFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              stockFilter === f.value
                ? "bg-app-green text-white"
                : "bg-white border border-app-border text-zinc-500 hover:bg-zinc-50"
            }`}
          >
            {f.label}
            {f.value !== "all" && (
              <span className="ml-1 opacity-70">
                (
                {f.value === "active"
                  ? products.filter((p) => p.stock > 0 && p.isActive).length
                  : products.filter((p) => !p.isActive || p.stock === 0).length}
                )
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-app-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-app-cream/50 text-zinc-500 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4 hidden sm:table-cell">Store</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Stock</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8"
                  >
                    <StatusState
                      icon={PackageIcon}
                      title={search ? "No products match your search" : "No products found"}
                      description={
                        search
                          ? "Try a different product name or category."
                          : "Products created by admins and vendors will appear here."
                      }
                      className="border-dashed"
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((product) => (
                  <tr
                    key={product.id || product._id}
                    className="hover:bg-zinc-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="size-10 rounded-lg object-cover shrink-0"
                        />
                        <div>
                          <p className="font-semibold text-zinc-900">
                            {product.name}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {product.category || "Uncategorized"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-600 hidden sm:table-cell">
                      {(product as any).store?.name ?? (
                        <span className="text-zinc-400 italic">Platform</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {formatCurrency(product.price)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          product.stock > 0 && product.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {product.stock > 0 && product.isActive
                          ? `${product.stock} in stock`
                          : "Out of stock"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {confirmDeactivate === (product.id || product._id) ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-red-600 font-medium">
                            Deactivate?
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleDeactivate(product.id || product._id)
                            }
                            className="px-2.5 py-1 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeactivate(null)}
                            className="px-2.5 py-1 text-xs font-medium text-zinc-600 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/admin/products/${product.id}/edit`}
                            className="p-2 text-zinc-500 hover:text-app-orange bg-zinc-100 hover:bg-orange-50 rounded-lg transition-colors"
                            aria-label={`Edit ${product.name}`}
                          >
                            <EditIcon className="size-4" />
                          </Link>
                          {(product.isActive || product.stock > 0) && (
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmDeactivate(product.id || product._id)
                              }
                              title="Mark Out of Stock"
                              aria-label={`Mark ${product.name} out of stock`}
                              className="p-2 text-zinc-500 hover:text-red-600 bg-zinc-100 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <XIcon className="size-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
