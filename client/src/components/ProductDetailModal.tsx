import { useRef, useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MinusIcon,
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

const stockLabel = (stock: number) => {
  if (stock <= 0) return "Out of stock";
  if (stock <= 5) return `Low stock · ${stock} left`;
  return "In stock";
};

const ProductDetailModal = ({ product, onClose }: Props) => {
  const { addToCart } = useCart();
  const images =
    product.images && product.images.length
      ? product.images.filter(Boolean)
      : product.image
        ? [product.image]
        : [];

  const [index, setIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const touchStartX = useRef<number | null>(null);

  const clamp = (i: number) => (i + images.length) % Math.max(images.length, 1);
  const next = () => setIndex((i) => clamp(i + 1));
  const prev = () => setIndex((i) => clamp(i - 1));
  const maxQuantity = Math.max(product.stock || 0, 1);

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

  const handleAddToCart = () => {
    addToCart(product, quantity);
  };

  const specs = [
    ["Category", product.category || "—"],
    ["Unit", product.unit || "piece"],
    ["Type", product.isOrganic ? "Organic" : "Regular"],
    ["Stock", stockLabel(product.stock)],
    ["Store", product.store?.name || "—"],
  ];

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-detail-title"
    >
      <div
        className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[94vh] animate-fade-in shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 sm:px-6 py-4 border-b border-app-border flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-app-orange">
              Product details
            </p>
            <h2
              id="product-detail-title"
              className="text-lg sm:text-xl font-semibold text-app-green truncate pr-3"
            >
              {product.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-app-cream transition-colors shrink-0"
            aria-label="Close product details"
          >
            <XIcon className="size-5" />
          </button>
        </div>

        <div className="overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="sm:border-r sm:border-app-border">
              <div
                className="relative aspect-square bg-app-cream/50 touch-pan-y"
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
              >
                {images.length > 0 ? (
                  <img
                    src={images[index]}
                    alt={`${product.name} ${index + 1}`}
                    className="w-full h-full object-contain p-4 sm:p-6"
                  />
                ) : (
                  <div className="w-full h-full flex-center text-app-text-light">
                    No image available
                  </div>
                )}

                {product.discount > 0 && (
                  <span className="absolute top-4 left-4 px-2.5 py-1 text-xs font-semibold uppercase bg-app-orange text-white rounded-full">
                    {product.discount}% OFF
                  </span>
                )}

                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={prev}
                      className="absolute left-3 top-1/2 -translate-y-1/2 size-10 rounded-full bg-white/90 shadow flex-center text-app-green hover:bg-white"
                      aria-label="Previous product image"
                    >
                      <ChevronLeftIcon className="size-5" />
                    </button>
                    <button
                      type="button"
                      onClick={next}
                      className="absolute right-3 top-1/2 -translate-y-1/2 size-10 rounded-full bg-white/90 shadow flex-center text-app-green hover:bg-white"
                      aria-label="Next product image"
                    >
                      <ChevronRightIcon className="size-5" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {images.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setIndex(i)}
                          className={`size-2 rounded-full transition-colors ${i === index ? "bg-app-green" : "bg-white/80"}`}
                          aria-label={`Show image ${i + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar p-4">
                  {images.map((url, i) => (
                    <button
                      key={`${url}-${i}`}
                      type="button"
                      onClick={() => setIndex(i)}
                      className={`size-16 rounded-xl overflow-hidden border shrink-0 ${i === index ? "border-app-green ring-2 ring-app-green/30" : "border-app-border"}`}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 sm:p-6 space-y-5">
              <div className="space-y-2">
                {product.store?.name && (
                  <p className="text-sm text-app-text-light flex items-center gap-1.5">
                    <StoreIcon className="size-4" /> {product.store.name}
                  </p>
                )}
                <div className="flex flex-wrap items-end gap-2">
                  <span className="text-3xl font-semibold text-app-green">
                    {formatCurrency(product.price)}
                  </span>
                  <span className="text-sm text-app-text-light pb-1">
                    /{product.unit}
                  </span>
                  {product.originalPrice > product.price && (
                    <span className="text-sm text-app-text-light line-through pb-1">
                      {formatCurrency(product.originalPrice)}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${product.stock > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                  >
                    {stockLabel(product.stock)}
                  </span>
                  {product.rating > 0 && (
                    <span className="flex items-center gap-1 text-xs font-medium text-app-text">
                      <StarIcon className="size-3.5 text-app-warning fill-app-warning" />
                      {product.rating} ({product.reviewCount})
                    </span>
                  )}
                </div>
              </div>

              <section>
                <h3 className="text-sm font-semibold text-app-green mb-1.5">
                  Description
                </h3>
                <p className="text-sm leading-6 text-app-text-light whitespace-pre-line">
                  {product.description || "No description has been added yet."}
                </p>
              </section>

              {product.specifications && (
                <section>
                  <h3 className="text-sm font-semibold text-app-green mb-1.5">
                    Specifications
                  </h3>
                  <p className="text-sm leading-6 text-app-text-light whitespace-pre-line">
                    {product.specifications}
                  </p>
                </section>
              )}

              <section>
                <h3 className="text-sm font-semibold text-app-green mb-2">
                  Product info
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {specs.map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-app-cream/60 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-app-text-light">
                        {label}
                      </p>
                      <p className="text-sm font-medium text-app-text truncate">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>

        <div className="px-5 sm:px-6 py-4 border-t border-app-border flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="flex items-center justify-between sm:justify-start gap-3">
            <span className="text-sm font-medium text-app-text">Quantity</span>
            <div className="inline-flex items-center rounded-xl border border-app-border overflow-hidden">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="size-10 flex-center hover:bg-app-cream disabled:opacity-50"
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
              >
                <MinusIcon className="size-4" />
              </button>
              <span className="w-10 text-center text-sm font-semibold">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                className="size-10 flex-center hover:bg-app-cream disabled:opacity-50"
                disabled={product.stock <= 0 || quantity >= maxQuantity}
                aria-label="Increase quantity"
              >
                <PlusIcon className="size-4" />
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={product.stock <= 0}
            className="flex-1 py-3 bg-app-orange text-white font-semibold rounded-xl hover:bg-app-orange-dark transition-colors active:scale-[0.98] flex-center gap-2 disabled:opacity-60"
          >
            <PlusIcon className="size-4" />
            {product.stock <= 0 ? "Out of stock" : `Add ${quantity} to Cart`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailModal;
