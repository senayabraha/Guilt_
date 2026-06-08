import { LeafIcon } from "lucide-react";

interface Props {
  categories: { slug: string; name: string }[];
  category: string;
  organic: string;
  sort: string;
  minPrice: string;
  maxPrice: string;
  updateFilter: (key: string, value: string) => void;
  clearFilters: () => void;
  hasFilters: boolean;
}

const SORT_OPTIONS = [
  { value: "", label: "Newest" },
  { value: "price_asc", label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
  { value: "rating", label: "Top Rated" },
  { value: "name", label: "A → Z" },
];

const FilterPanel = ({
  categories,
  category,
  organic,
  sort,
  minPrice,
  maxPrice,
  updateFilter,
  clearFilters,
  hasFilters,
}: Props) => {
  const categoriesWithAll = [{ slug: "", name: "All Categories" }, ...categories];

  return (
    <div className="space-y-6">
      {/* Sort */}
      <div>
        <h3 className="text-sm font-semibold text-app-green mb-3">Sort by</h3>
        <div className="space-y-0.5">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateFilter("sort", opt.value)}
              className={`block w-full text-left px-3 py-2 text-sm rounded-lg transition-all ${
                sort === opt.value
                  ? "bg-app-green text-white font-medium"
                  : "text-app-text-light hover:bg-app-cream"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      <div>
        <h3 className="text-sm font-semibold text-app-green mb-3">Category</h3>
        <div className="space-y-0.5">
          {categoriesWithAll.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => updateFilter("category", cat.slug)}
              className={`block w-full text-left px-3 py-2 text-sm rounded-lg transition-all ${
                category === cat.slug
                  ? "bg-app-green text-white font-medium"
                  : "text-app-text-light hover:bg-app-cream"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h3 className="text-sm font-semibold text-app-green mb-3">
          Price Range (ETB)
        </h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={minPrice}
            min={0}
            onChange={(e) => updateFilter("minPrice", e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white rounded-lg border border-app-border focus:border-app-green outline-none"
          />
          <span className="text-app-text-light text-sm shrink-0">—</span>
          <input
            type="number"
            placeholder="Max"
            value={maxPrice}
            min={0}
            onChange={(e) => updateFilter("maxPrice", e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white rounded-lg border border-app-border focus:border-app-green outline-none"
          />
        </div>
      </div>

      {/* Organic toggle */}
      <div>
        <h3 className="text-sm font-semibold text-app-green mb-3">
          Product type
        </h3>
        <label className="flex items-center gap-3 cursor-pointer select-none group">
          <button
            type="button"
            role="switch"
            aria-checked={!!organic}
            onClick={() => updateFilter("organic", organic ? "" : "1")}
            className={`w-10 h-5 rounded-full flex items-center transition-colors px-0.5 shrink-0 ${
              organic ? "bg-app-green" : "bg-zinc-200"
            }`}
          >
            <div
              className={`size-4 rounded-full bg-white shadow-sm transition-transform ${
                organic ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <span className="flex items-center gap-1.5 text-sm text-app-text-light group-hover:text-app-text transition-colors">
            <LeafIcon className="size-3.5 text-green-600" />
            Organic only
          </span>
        </label>
      </div>

      {hasFilters && (
        <button
          onClick={clearFilters}
          className="w-full py-2 text-sm text-app-error hover:bg-red-50 rounded-lg transition-colors font-medium border border-red-100"
        >
          Clear All Filters
        </button>
      )}
    </div>
  );
};

export default FilterPanel;
