import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SearchIcon } from "lucide-react";

import LocationSelector from "../LocationSelector";

// Prominent, marketplace-style search so Zembil feels like a shopping tool
// immediately. Routes to the existing /search results page.
const HomeSearch = () => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : "/products");
  };

  return (
    <section className="mb-6">
      <div className="bg-white rounded-2xl shadow-sm border border-app-border p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <LocationSelector />
          <span className="hidden sm:inline text-xs text-app-text-light">
            Cash on delivery across Addis Ababa
          </span>
        </div>

        <form onSubmit={submit} className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-zinc-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search teff, coffee, milk, injera, or stores"
              aria-label="Search products and stores"
              className="w-full pl-12 pr-4 py-3.5 sm:py-4 bg-app-cream/60 rounded-xl text-sm sm:text-base outline-none ring-1 ring-app-border focus:ring-2 focus:ring-app-orange/40 transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-5 sm:px-8 bg-app-orange text-white font-semibold rounded-xl hover:bg-app-orange-dark transition-colors active:scale-[0.98] flex-center gap-2 shrink-0"
          >
            <SearchIcon className="size-4 sm:hidden" />
            <span className="hidden sm:inline">Search</span>
          </button>
        </form>
      </div>
    </section>
  );
};

export default HomeSearch;
