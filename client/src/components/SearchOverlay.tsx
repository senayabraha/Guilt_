import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRightIcon,
  ClockIcon,
  LayoutGridIcon,
  SearchIcon,
  ShoppingBasketIcon,
  StoreIcon,
  XIcon,
} from "lucide-react";
import { getPublicProducts } from "../lib/db/products";
import { getPublicStores } from "../lib/db/stores";
import { categoriesData } from "../assets/assets";
import type { Product, Store } from "../types";
import { formatCurrency } from "../lib/format";

const RECENT_KEY = "zembil_recent_searches";
const MAX_RECENT = 8;

function getRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecent(q: string) {
  const prev = getRecent().filter((s) => s !== q);
  localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...prev].slice(0, MAX_RECENT)));
}

function removeRecent(q: string) {
  localStorage.setItem(
    RECENT_KEY,
    JSON.stringify(getRecent().filter((s) => s !== q)),
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
}

const SearchOverlay = ({ open, onClose }: Props) => {
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  // Reload recent from localStorage when opened
  useEffect(() => {
    if (open) {
      setRecent(getRecent());
      setQuery("");
      setProducts([]);
      setStores([]);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  // Debounced search
  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setProducts([]);
      setStores([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const [p, s] = await Promise.all([
          getPublicProducts({ search: q, }),
          getPublicStores({ search: q }),
        ]);
        setProducts(p.slice(0, 5));
        setStores(s.slice(0, 4));
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }, 280);
  }, []);

  useEffect(() => {
    search(query);
  }, [query, search]);

  const commit = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    saveRecent(trimmed);
    onClose();
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    commit(query);
  };

  const handleRecent = (q: string) => {
    setQuery(q);
    commit(q);
  };

  const deleteRecent = (q: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeRecent(q);
    setRecent(getRecent());
  };

  const handleStoreClick = () => {
    if (query.trim()) saveRecent(query.trim());
    onClose();
  };

  const handleProductClick = () => {
    if (query.trim()) saveRecent(query.trim());
    onClose();
  };

  const matchedCategories = query.trim()
    ? categoriesData.filter((c) =>
        c.name.toLowerCase().includes(query.toLowerCase()),
      ).slice(0, 3)
    : [];

  const hasResults =
    products.length > 0 || stores.length > 0 || matchedCategories.length > 0;
  const showEmpty = query.trim().length > 1 && !loading && !hasResults;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-app-border">
        <form onSubmit={handleSubmit} className="flex-1 relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4.5 text-zinc-400" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stores, products, categories…"
            className="w-full pl-10 pr-10 py-2.5 bg-app-cream/70 rounded-xl text-sm outline-none ring-1 ring-app-border focus:ring-2 focus:ring-app-orange/40 transition-all"
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              aria-label="Clear"
            >
              <XIcon className="size-4" />
            </button>
          )}
        </form>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 px-3 py-2 text-sm font-medium text-app-green hover:bg-app-cream rounded-xl transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Results area */}
      <div className="flex-1 overflow-y-auto">
        {/* Loading skeleton */}
        {loading && (
          <div className="px-4 pt-6 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-zinc-100 animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-2/3 bg-zinc-100 rounded animate-pulse" />
                  <div className="h-2.5 w-1/3 bg-zinc-100 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No query — show recent searches */}
        {!query && !loading && (
          <div className="px-4 pt-5">
            {recent.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                    Recent searches
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem(RECENT_KEY);
                      setRecent([]);
                    }}
                    className="text-xs text-app-orange hover:text-app-orange-dark"
                  >
                    Clear all
                  </button>
                </div>
                <ul className="space-y-1">
                  {recent.map((r) => (
                    <li key={r}>
                      <button
                        type="button"
                        onClick={() => handleRecent(r)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-app-cream transition-colors text-left"
                      >
                        <ClockIcon className="size-4 text-zinc-400 shrink-0" />
                        <span className="flex-1 text-sm text-zinc-700 truncate">
                          {r}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => deleteRecent(r, e)}
                          className="p-0.5 text-zinc-400 hover:text-zinc-600"
                          aria-label={`Remove ${r}`}
                        >
                          <XIcon className="size-3.5" />
                        </button>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Popular categories */}
            <div>
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
                Browse categories
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {categoriesData.slice(0, 6).map((cat) => (
                  <Link
                    key={cat.slug}
                    to={`/products?category=${cat.slug}`}
                    onClick={onClose}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-orange-50 hover:bg-orange-100 transition-colors text-center"
                  >
                    <div className="size-10 rounded-xl overflow-hidden bg-white flex-center">
                      {cat.image ? (
                        <img
                          src={cat.image}
                          alt={cat.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <LayoutGridIcon className="size-5 text-app-orange" />
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-zinc-700 leading-tight">
                      {cat.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {query && !loading && (
          <div className="px-4 pt-4 pb-8 space-y-6">
            {/* Stores */}
            {stores.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                    Stores
                  </h3>
                  <Link
                    to={`/stores?q=${encodeURIComponent(query)}`}
                    onClick={handleStoreClick}
                    className="text-xs font-medium text-app-orange hover:text-app-orange-dark flex items-center gap-0.5"
                  >
                    See all <ArrowRightIcon className="size-3" />
                  </Link>
                </div>
                <ul className="space-y-1">
                  {stores.map((store) => (
                    <li key={store.id}>
                      <Link
                        to={`/stores/${store.id}`}
                        onClick={handleStoreClick}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-app-cream transition-colors"
                      >
                        <div className="size-10 rounded-xl bg-app-green/10 border border-app-border overflow-hidden shrink-0 flex-center">
                          {store.logo ? (
                            <img
                              src={store.logo}
                              alt={store.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <StoreIcon className="size-4 text-app-green" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-900 truncate">
                            {store.name}
                          </p>
                          <p className="text-xs text-zinc-500 truncate">
                            {store.isOpen ? (
                              <span className="text-green-600">Open now</span>
                            ) : (
                              <span className="text-zinc-400">Closed</span>
                            )}
                            {store.city ? ` · ${store.city}` : ""}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Categories */}
            {matchedCategories.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                  Categories
                </h3>
                <ul className="space-y-1">
                  {matchedCategories.map((cat) => (
                    <li key={cat.slug}>
                      <Link
                        to={`/products?category=${cat.slug}`}
                        onClick={onClose}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-app-cream transition-colors"
                      >
                        <div className="size-10 rounded-xl overflow-hidden bg-orange-50 flex-center shrink-0">
                          {cat.image ? (
                            <img
                              src={cat.image}
                              alt={cat.name}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <LayoutGridIcon className="size-4 text-app-orange" />
                          )}
                        </div>
                        <span className="text-sm font-medium text-zinc-900">
                          {cat.name}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Products */}
            {products.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                    Products
                  </h3>
                  <Link
                    to={`/search?q=${encodeURIComponent(query)}`}
                    onClick={handleProductClick}
                    className="text-xs font-medium text-app-orange hover:text-app-orange-dark flex items-center gap-0.5"
                  >
                    See all <ArrowRightIcon className="size-3" />
                  </Link>
                </div>
                <ul className="space-y-1">
                  {products.map((product) => (
                    <li key={product._id}>
                      <Link
                        to={`/products/${product._id}`}
                        onClick={handleProductClick}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-app-cream transition-colors"
                      >
                        <div className="size-10 rounded-xl overflow-hidden bg-app-cream shrink-0">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ShoppingBasketIcon className="size-4 text-app-green" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-900 truncate">
                            {product.name}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {formatCurrency(product.price)}
                            {product.store?.name
                              ? ` · ${product.store.name}`
                              : ""}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Search all results CTA */}
            {hasResults && (
              <button
                type="button"
                onClick={() => commit(query)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-app-border text-sm font-medium text-app-green hover:bg-app-cream transition-colors"
              >
                <SearchIcon className="size-4" />
                Search all results for &ldquo;{query}&rdquo;
              </button>
            )}

            {/* Empty state */}
            {showEmpty && (
              <div className="text-center py-10">
                <div className="size-14 rounded-2xl bg-app-cream flex-center mx-auto mb-3">
                  <SearchIcon className="size-6 text-zinc-400" />
                </div>
                <p className="text-sm font-semibold text-zinc-700 mb-1">
                  No results for &ldquo;{query}&rdquo;
                </p>
                <p className="text-xs text-zinc-400">
                  Try a different search term or browse categories below.
                </p>
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {categoriesData.slice(0, 4).map((cat) => (
                    <Link
                      key={cat.slug}
                      to={`/products?category=${cat.slug}`}
                      onClick={onClose}
                      className="px-3 py-1.5 bg-orange-50 text-app-orange-dark text-xs font-medium rounded-full hover:bg-orange-100 transition-colors"
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchOverlay;
