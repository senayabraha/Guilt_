import { useRef, useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  StarIcon,
  StoreIcon,
  XIcon,
} from "lucide-react";

import type { Product } from "../types";
import { useCart } from "../context/CartContext";
import { formatCurrency } from "../lib/format";

interface Props {
  product: Product;
  onClose: () => void;
}

// Product popup with a swipeable image carousel, details, specs and Add to Cart.
const ProductQuickView = ({ product, onClose }: Props) => {
  const { addToCart } = useCart();
  const images =
    product.images && product.images.length
      ? product.images
      : product.image
        ? [product.image]
        : [];

  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const clamp = (i: number) => (i + images.length) % Math.max(images.length, 1);
  const next = () => setIndex((i) => clamp(i + 1));
  const prev = () => setIndex((i) => clamp(i - 1));

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40 && images.length > 1) {
      dx < 0 ? next() : prev();
    }
    touchStartX.current = null;
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col max-h-[92vh] animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-app-border flex items-center justify-between">
          <h2 className="font-semibold text-app-green truncate pr-3">
            {product.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-app-cream transition-colors shrink-0"
          >
            <XIcon className="size-5" />
          </button>
        </div>

        <div className="overflow-y-auto">
          {/* Image carousel */}
          <div
            className="relative aspect-square bg-app-cream/50"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {images.length > 0 && (
              <img
                src={images[index]}
                alt={`${product.name} ${index + 1}`}
                className="w-full h-full object-contain p-4"
              />
            )}

            {product.discount > 0 && (
              <span className="absolute top-3 left-3 px-2 py-0.5 text-[10px] font-semibold uppercase bg-app-orange text-white rounded-full">
                {product.discount}% OFF
              </span>
            )}

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 size-9 rounded-full bg-white/90 shadow flex-center text-app-green hover:bg-white"
                >
                  <ChevronLeftIcon className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={next}
                  className="absolute right-2 top-1/2 -translate-y-1/2 size-9 rounded-full bg-white/90 shadow flex-center text-app-green hover:bg-white"
                >
                  <ChevronRightIcon className="size-5" />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, i) => (
                    <span
                      key={i}
                      className={`size-1.5 rounded-full transition-colors ${i === index ? "bg-app-green" : "bg-app-green/30"}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar px-5 pt-3">
              {images.map((url, i) => (
                <button
                  key={`${url}-${i}`}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={`size-14 rounded-lg overflow-hidden border shrink-0 ${i === index ? "border-app-green ring-2 ring-app-green/30" : "border-app-border"}`}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Details */}
          <div className="p-5 space-y-3">
            {product.store?.name && (
              <p className="text-xs text-app-text-light flex items-center gap-1">
                <StoreIcon className="size-3.5" /> {product.store.name}
              </p>
            )}

            <div className="flex items-end gap-2">
              <span className="text-2xl font-semibold text-app-green">
                {formatCurrency(product.price)}
              </span>
              <span className="text-sm text-app-text-light">
                /{product.unit}
              </span>
              {product.originalPrice > product.price && (
                <span className="text-sm text-app-text-light line-through">
                  {formatCurrency(product.originalPrice)}
                </span>
              )}
            </div>

            {product.rating > 0 && (
              <div className="flex items-center gap-1">
                <StarIcon className="size-3.5 text-app-warning fill-app-warning" />
                <span className="text-xs font-medium text-app-text">
                  {product.rating}
                </span>
                <span className="text-xs text-app-text-light">
                  ({product.reviewCount} reviews)
                </span>
              </div>
            )}

            {product.description && (
              <div>
                <h3 className="text-sm font-semibold text-app-green mb-1">
                  Description
                </h3>
                <p className="text-sm text-app-text-light whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}

            {product.specifications && (
              <div>
                <h3 className="text-sm font-semibold text-app-green mb-1">
                  Specifications
                </h3>
                <p className="text-sm text-app-text-light whitespace-pre-line">
                  {product.specifications}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer action */}
        <div className="px-5 py-4 border-t border-app-border">
          <button
            type="button"
            onClick={() => addToCart(product)}
            disabled={product.stock <= 0}
            className="w-full py-3 bg-app-orange text-white font-semibold rounded-xl hover:bg-app-orange-dark transition-colors active:scale-[0.98] flex-center gap-2 disabled:opacity-60"
          >
            <PlusIcon className="size-4" />
            {product.stock <= 0 ? "Out of stock" : "Add to Cart"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductQuickView;
