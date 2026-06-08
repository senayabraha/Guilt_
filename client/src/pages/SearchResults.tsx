import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronDown, Home, Search } from "lucide-react";
import toast from "react-hot-toast";

import type { Product } from "../types";
import Loading from "../components/Loading";
import ProductCard from "../components/ProductCard";
import { getPublicProducts } from "../lib/db/products";
import { categoriesData } from "../assets/assets";

const SORT_OPTIONS = [
  { value: "", label: "Most relevant" },
  { value: "price_asc", label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
  { value: "rating", label: "Top Rated" },
  { value: "name", label: "A → Z" },
];

// A handful of popular categories to surface in the empty state
const SUGGESTED_CATEGORIES = categoriesData.slice(0, 6);

const SearchResults = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const sort = searchParams.get("sort") || "";

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState(query);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the search input in sync when the URL query changes (e.g. browser back)
  useEffect(() => {
    setInputValue(query);
  }, [query]);

  useEffect(() => {
    if (!query) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getPublicProducts({ search: query, sort })
      .then(setProducts)
      .catch((error: any) => toast.error(error?.message || "Search failed"))
      .finally(() => setLoading(false));
  }, [query, sort]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = inputValue.trim();
    if (!q) return;
    const next = new URLSearchParams();
    next.set("q", q);
    if (sort) next.set("sort", sort);
    navigate(`/search?${next.toString()}`);
  };

  const updateSort = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("sort", value);
    else next.delete("sort");
    setSearchParams(next);
  };

  return (
    <div className="min-h-screen bg-app-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-app-text-light mb-6">
          <Link to="/" className="hover:text-app-green transition-colors">
            <Home className="size-4" />
          </Link>
          <span>/</span>
          <span className="text-app-green font-medium">Search</span>
        </nav>

        {/* Re-search form */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
              <input
                ref={inputRef}
                type="search"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Search products and stores…"
                aria-label="Search"
                className="w-full pl-11 pr-4 py-3 bg-white border border-app-border rounded-xl text-sm outline-none focus:border-app-orange focus:ring-2 focus:ring-app-orange/20 transition-all"
              />
            </div>
            <button
              type="submit"
              className="px-5 bg-app-orange text-white font-semibold rounded-xl hover:bg-app-orange-dark transition-colors shrink-0"
            >
              Search
            </button>
          </div>
        </form>

        {/* Header row — result count + sort */}
        {query && (
          <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-semibold text-app-green">
                Results for &ldquo;{query}&rdquo;
              </h1>
              <p className="text-sm text-app-text-light mt-0.5">
                {loading ? "Searching…" : `${products.length} items found`}
              </p>
            </div>

            {/* Sort */}
            {!loading && products.length > 0 && (
              <div className="relative shrink-0">
                <select
                  value={sort}
                  onChange={(e) => updateSort(e.target.value)}
                  aria-label="Sort results"
                  className="appearance-none pl-3 pr-8 py-2 text-sm bg-white rounded-xl border border-app-border focus:border-app-green outline-none cursor-pointer"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-app-text-light pointer-events-none" />
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {!query ? (
          // No query yet — prompt to search
          <div className="text-center py-20">
            <Search className="size-14 text-app-border mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-app-green mb-2">
              What are you looking for?
            </h2>
            <p className="text-sm text-app-text-light mb-6">
              Type a product or store name to get started.
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {SUGGESTED_CATEGORIES.map((cat) => (
                <Link
                  key={cat.slug}
                  to={`/products?category=${cat.slug}`}
                  className="px-3 py-1.5 bg-white border border-app-border rounded-full text-xs font-medium text-app-text-light hover:border-app-green hover:text-app-green transition-colors"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        ) : loading ? (
          <Loading />
        ) : products.length === 0 ? (
          // No results — helpful guidance
          <div className="text-center py-16">
            <Search className="size-14 text-app-border mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-app-green mb-2">
              No results for &ldquo;{query}&rdquo;
            </h2>
            <p className="text-sm text-app-text-light mb-2 max-w-sm mx-auto">
              Check your spelling, try a shorter term, or browse a category
              below.
            </p>
            <p className="text-xs text-app-text-light mb-6 max-w-sm mx-auto">
              Note: search currently covers product names and descriptions.
              Searching by store name is coming soon.
            </p>

            {/* Category shortcuts */}
            <div className="flex flex-wrap gap-2 justify-center mb-8">
              {SUGGESTED_CATEGORIES.map((cat) => (
                <Link
                  key={cat.slug}
                  to={`/products?category=${cat.slug}`}
                  className="px-3 py-1.5 bg-white border border-app-border rounded-full text-xs font-medium text-app-text-light hover:border-app-green hover:text-app-green transition-colors"
                >
                  {cat.name}
                </Link>
              ))}
            </div>

            <Link
              to="/products"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-app-green text-white text-sm font-medium rounded-xl hover:bg-app-green-light transition-colors"
            >
              Browse All Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;
