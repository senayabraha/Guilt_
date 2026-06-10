import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Home, SlidersHorizontal, XIcon } from "lucide-react";

import type { Product } from "../types";
import { categoriesData } from "../assets/assets";
import ProductCard from "../components/ProductCard";
import Loading from "../components/Loading";
import FilterPanel from "../components/FilterPanel";
import StatusState from "../components/StatusState";
import { getPublicProducts } from "../lib/db/products";

const SORT_LABELS: Record<string, string> = {
  price_asc: "Price: Low → High",
  price_desc: "Price: High → Low",
  rating: "Top Rated",
  name: "A → Z",
};

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const category = searchParams.get("category") || "";
  const organic = searchParams.get("organic") || "";
  const sort = searchParams.get("sort") || "";
  const page = Number(searchParams.get("page")) || 1;
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let data = await getPublicProducts({ category, sort, minPrice, maxPrice });
      if (organic) data = data.filter((p) => p.isOrganic);
      setProducts(data);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setSearchParams(next);
  };

  const clearFilters = () => setSearchParams({});

  const activeCategory = categoriesData.find((c) => c.slug === category);
  const hasFilters = !!(category || organic || minPrice || maxPrice || sort);

  // Pills for active filters — lets users remove one at a time
  const activePills = [
    ...(category && activeCategory
      ? [{ key: "category", label: activeCategory.name }]
      : []),
    ...(organic ? [{ key: "organic", label: "Organic only" }] : []),
    ...(minPrice ? [{ key: "minPrice", label: `From ETB ${minPrice}` }] : []),
    ...(maxPrice ? [{ key: "maxPrice", label: `Up to ETB ${maxPrice}` }] : []),
    ...(sort && SORT_LABELS[sort]
      ? [{ key: "sort", label: SORT_LABELS[sort] }]
      : []),
  ];

  useEffect(() => {
    fetchProducts();
  }, [category, organic, sort, page, minPrice, maxPrice]);

  return (
    <div className="min-h-screen bg-app-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-app-text-light mb-6">
          <Link to="/" className="hover:text-app-green transition-colors">
            <Home className="size-4" />
          </Link>
          <span>/</span>
          <span className="text-app-green font-medium">
            {activeCategory ? activeCategory.name : "All Products"}
          </span>
        </nav>

        <div className="flex gap-8 xl:gap-10">
          {/* Sidebar — desktop */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="bg-white rounded-2xl p-4 sticky top-24">
              <FilterPanel
                categories={categoriesData}
                category={category}
                organic={organic}
                sort={sort}
                minPrice={minPrice}
                maxPrice={maxPrice}
                updateFilter={updateFilter}
                clearFilters={clearFilters}
                hasFilters={hasFilters}
              />
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-semibold text-app-green">
                  {activeCategory ? activeCategory.name : "All Products"}
                </h1>
                <p className="text-sm text-app-text-light mt-0.5">
                  {loading ? "Loading…" : `${products.length} products`}
                </p>
              </div>

              {/* Mobile filter button */}
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(true)}
                className="lg:hidden flex items-center gap-2 px-3 py-2 text-sm bg-white rounded-xl border border-app-border hover:bg-app-cream transition-colors"
              >
                <SlidersHorizontal className="size-4" />
                Filters
                {hasFilters && (
                  <span className="size-4 flex-center bg-app-orange text-white text-[10px] font-semibold rounded-full">
                    {activePills.length}
                  </span>
                )}
              </button>
            </div>

            {/* Active filter pills */}
            {activePills.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {activePills.map((pill) => (
                  <button
                    type="button"
                    key={pill.key}
                    onClick={() => updateFilter(pill.key, "")}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-app-green text-white text-xs font-medium rounded-full hover:bg-app-green-light transition-colors"
                  >
                    {pill.label}
                    <XIcon className="size-3" />
                  </button>
                ))}
                {activePills.length > 1 && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="px-3 py-1.5 text-xs font-medium text-app-text-light bg-white border border-app-border rounded-full hover:bg-app-cream transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
            )}

            {/* Product grid */}
            {loading ? (
              <Loading />
            ) : products.length === 0 ? (
              <StatusState
                icon={SlidersHorizontal}
                title="No products found"
                description={
                  hasFilters
                    ? "Try removing some filters to see more results."
                    : "No products are available right now."
                }
                action={
                  hasFilters ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="px-5 py-2 text-sm font-medium bg-app-green text-white rounded-xl hover:bg-app-green-light transition-colors"
                  >
                    Clear Filters
                  </button>
                  ) : null
                }
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map(
                  (product) =>
                    product.stock > 0 && (
                      <ProductCard key={product.id} product={product} />
                    ),
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile filter sheet */}
      {mobileFiltersOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-50"
            onClick={() => setMobileFiltersOpen(false)}
            aria-hidden="true"
          />
          <div
            className="fixed bottom-0 left-0 right-0 bg-white z-50 rounded-t-2xl max-h-[85vh] overflow-y-auto animate-slide-in-up"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-filters-title"
          >
            <div className="flex items-center justify-between p-4 border-b border-app-border sticky top-0 bg-white">
              <h3 id="mobile-filters-title" className="text-lg font-semibold text-app-green">
                Filter &amp; Sort
              </h3>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="p-2 hover:bg-app-cream rounded-lg transition-colors"
                aria-label="Close filters"
              >
                <XIcon className="size-5" />
              </button>
            </div>
            <div className="p-4">
              <FilterPanel
                categories={categoriesData}
                category={category}
                organic={organic}
                sort={sort}
                minPrice={minPrice}
                maxPrice={maxPrice}
                updateFilter={(key, value) => {
                  updateFilter(key, value);
                }}
                clearFilters={() => {
                  clearFilters();
                  setMobileFiltersOpen(false);
                }}
                hasFilters={hasFilters}
              />
            </div>
            {/* Done button */}
            <div className="p-4 border-t border-app-border sticky bottom-0 bg-white">
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="w-full py-3 bg-app-green text-white font-semibold rounded-xl hover:bg-app-green-light transition-colors"
              >
                Show {loading ? "…" : products.length} results
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Products;
