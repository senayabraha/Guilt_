import { useState } from "react";
import { createPortal } from "react-dom";
import { HeartIcon, LeafIcon, Plus, Star, StoreIcon } from "lucide-react";

import type { Product } from "../types";
import { useCart } from "../context/CartContext";
import { useFavorites } from "../context/useFavorites";
import { formatCurrency } from "../lib/format";
import ProductDetailModal from "./ProductDetailModal";

interface Props {
  product: Product;
}

const ProductCard = ({ product }: Props) => {
  const { addToCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [showProductDetails, setShowProductDetails] = useState(false);

  const isOutOfStock = product.stock <= 0;
  const isLowStock = !isOutOfStock && product.stock <= 5;
  const productId = product.id || product._id;
  const saved = isFavorite(productId);

  return (
    <>
      <div
        role="article"
        aria-label={product.name}
        className="bg-white rounded-2xl overflow-hidden shadow hover:shadow-md transition-all duration-300 group animate-fade-in cursor-pointer"
        onClick={() => setShowProductDetails(true)}
      >
        {/* Image */}
        <div className="relative aspect-square overflow-hidden">
          <img
            src={product.image}
            alt={product.name}
            className={`w-full h-full object-cover p-4 transition-all duration-300 ${
              isOutOfStock
                ? "opacity-60"
                : "group-hover:p-2"
            }`}
          />

          {/* Top-left badges: discount + organic stacked */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {product.discount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-semibold uppercase bg-app-orange text-white rounded-full">
                {product.discount}% OFF
              </span>
            )}
            {product.isOrganic && (
              <span className="flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-semibold bg-green-700 text-white rounded-full">
                <LeafIcon className="size-2.5" /> Organic
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(productId, product.name);
            }}
            className={`absolute right-3 top-3 flex size-8 items-center justify-center rounded-full shadow-sm transition-colors ${
              saved
                ? "bg-app-orange text-white"
                : "bg-white/90 text-zinc-600 hover:bg-white hover:text-app-orange"
            }`}
            aria-label={saved ? `Unsave ${product.name}` : `Save ${product.name}`}
            aria-pressed={saved}
          >
            <HeartIcon className={`size-4 ${saved ? "fill-white" : ""}`} />
          </button>

          {/* Out-of-stock overlay label — bottom-centre of image */}
          {isOutOfStock && (
            <div className="absolute inset-x-0 bottom-0 flex justify-center pb-2.5">
              <span className="px-2.5 py-1 text-[10px] font-semibold uppercase bg-zinc-800/80 text-white rounded-full backdrop-blur-sm">
                Out of stock
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3.5 flex flex-col gap-1">
          {/* Product name */}
          <h3 className="text-sm font-medium leading-snug line-clamp-2 text-zinc-800">
            {product.name}
          </h3>

          {/* Store name — only when store data is embedded in the product */}
          {product.store?.name && (
            <p className="flex items-center gap-1 text-[11px] text-app-text-light truncate">
              <StoreIcon className="size-2.5 shrink-0" />
              {product.store.name}
            </p>
          )}

          {/* Low-stock urgency signal */}
          {isLowStock && (
            <p className="text-[10px] font-semibold text-amber-600">
              Only {product.stock} left
            </p>
          )}

          {/* Rating */}
          {product.rating > 0 && (
            <div className="flex items-center gap-1">
              <Star className="size-3 text-app-warning fill-app-warning" />
              <span className="text-xs font-medium text-app-text">
                {product.rating}
              </span>
              <span className="text-xs text-app-text-light">
                ({product.reviewCount})
              </span>
            </div>
          )}

          {/* Price row + Add button */}
          <div className="flex items-center justify-between mt-0.5">
            <div className="flex items-center gap-1 min-w-0 truncate">
              <span
                className={`text-base font-semibold ${
                  isOutOfStock ? "text-app-text-light" : "text-zinc-800"
                }`}
              >
                {formatCurrency(product.price)}
              </span>
              <span className="text-xs text-app-text-light shrink-0">
                /{product.unit}
              </span>
              {product.originalPrice > product.price && (
                <span className="text-xs text-app-text-light line-through ml-1 shrink-0">
                  {formatCurrency(product.originalPrice)}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (!isOutOfStock) addToCart(product);
              }}
              disabled={isOutOfStock}
              className="size-7 rounded-full bg-app-orange text-white flex-center shrink-0 ml-2 hover:bg-app-orange-dark transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label={
                isOutOfStock
                  ? `${product.name} is out of stock`
                  : `Add ${product.name} to cart`
              }
            >
              <Plus className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {showProductDetails &&
        createPortal(
          <ProductDetailModal
            product={product}
            onClose={() => setShowProductDetails(false)}
          />,
          document.body,
        )}
    </>
  );
};

export default ProductCard;
