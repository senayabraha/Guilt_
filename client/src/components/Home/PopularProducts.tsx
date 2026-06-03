import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRightIcon } from "lucide-react";
import toast from "react-hot-toast";

import type { Product } from "../../types";
import ProductCard from "../ProductCard";

import { getPublicProducts } from "../../lib/db/products";

const PopularProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    getPublicProducts({ sort: "rating" })
      .then(setProducts)
      .catch((error: any) => {
        toast.error(error?.message || "Failed to load products");
      });
  }, []);

  return (
    <section className="pb-16">
      <div className="max-w-7xl mx-auto ">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-semibold">Fresh picks from Addis stores</h2>
            <p className="text-sm text-app-text-light mt-1">
              Top-rated items from local stores near you
            </p>
          </div>
          <Link
            to="/products"
            className="text-sm font-semibold text-app-orange hover:text-app-orange-dark flex items-center gap-1 transition-colors"
          >
            View All <ArrowRightIcon className="size-4" />
          </Link>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 xl:gap-8">
            {products.slice(0, 10).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-3xl border border-dashed border-app-border bg-gradient-to-br from-orange-50 to-white">
            <div className="size-16 rounded-2xl bg-app-orange/10 flex items-center justify-center mb-5">
              <span className="text-3xl">🧺</span>
            </div>

            <h3 className="text-xl font-semibold text-zinc-900">
              Fresh products are being added
            </h3>

            <p className="text-sm text-app-text-light mt-2 max-w-md">
              Browse local stores while new items arrive across Addis Ababa.
            </p>

            <Link
              to="/stores"
              className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-full bg-app-orange text-white text-sm font-medium hover:bg-app-orange-dark transition-colors"
            >
              Browse Stores
              <ArrowRightIcon className="size-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default PopularProducts;
