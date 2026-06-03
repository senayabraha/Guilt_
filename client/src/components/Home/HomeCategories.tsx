import { Link } from "react-router-dom";
import { ShoppingBasketIcon } from "lucide-react";
import { categoriesData } from "../../assets/assets";

const HomeCategories = () => {
  return (
    <section id="categories" className="py-8 scroll-mt-20">
      <div className="max-w-7xl mx-auto">
        <div>
          <h2 className="text-xl font-semibold text-app-green">
            Shop by category
          </h2>
          <p className="text-sm text-app-text-light mt-1">
            Everyday essentials from stores near you
          </p>
        </div>
        <div className="flex items-center mt-5 overflow-x-scroll no-scrollbar">
          {categoriesData.map((cat) => (
            <Link
              key={cat.slug}
              to={`/products?category=${cat.slug}`}
              onClick={() => window.scrollTo(0, 0)}
              className="group flex flex-col items-center gap-3 p-4"
            >
              <div className="size-18 sm:size-26 sm:p-2 rounded-2xl overflow-hidden bg-orange-100 group-hover:ring-2 ring-orange-300/75 transition-all flex-center">
                {cat.image ? (
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-contain rounded-full transition-all"
                  />
                ) : (
                  <ShoppingBasketIcon className="size-7 sm:size-10 text-app-green" />
                )}
              </div>
              <span className="text-xs font-medium text-zinc-600 text-center leading-tight">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomeCategories;
