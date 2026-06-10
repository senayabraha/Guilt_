import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  LeafIcon,
  MessageCircleIcon,
  MinusIcon,
  PlusIcon,
  StarIcon,
  StoreIcon,
  TruckIcon,
  XIcon,
} from "lucide-react";

import type { Product } from "../types";
import { useCart } from "../context/CartContext";
import { deliveryEstimate, formatCurrency } from "../lib/format";

interface Props {
  product: Product;
  onClose: () => void;
}

const stockLabel = (stock: number) => {
  if (stock <= 0) return "Out of stock";
  if (stock <= 5) return `Low stock · ${stock} left`;
  return "In stock";
};

const stockBadgeClass = (stock: number) => {
  if (stock <= 0) return "bg-red-100 text-red-700";
  if (stock <= 5) return "bg-amber-100 text-amber-700";
  return "bg-green-100 text-green-700";
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

  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

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

  const storeId = product.store?.id || product.storeId;
  const store = product.store;

  // Delivery info derived from real store fields — no invented data
  const eta = store?.id ? deliveryEstimate({ id: store.id, deliveryRadius: store.deliveryRadius }) : null;
  const deliveryFeeLabel =
    store?.deliveryFee != null
      ? store.deliveryFee === 0
        ? "Free delivery"
        : `${formatCurrency(store.deliveryFee)} delivery`
      : null;
  const minOrderLabel = store?.minOrder ? `Min. order ${formatCurrency(store.minOrder)}` : null;

  const specs = [
    ["Category", product.category || "—"],
    ["Unit", product.unit || "piece"],
    ["Type", product.isOrganic ? "Organic" : "Regular"],
    ["Stock", stockLabel(product.stock)],
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
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-app-border flex items-center justify-between shrink-0">
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

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            {/* Image column */}
            <div className="sm:border-r sm:border-app-border">
              <div
                className="relative aspect-[4/3] sm:aspect-square bg-app-cream/50 touch-pan-y"
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
                  <div className="w-full h-full flex items-center justify-center text-app-text-light text-sm">
                    No image available
                  </div>
                )}

                {/* Badges: discount + organic */}
                <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                  {product.discount > 0 && (
                    <span className="px-2.5 py-1 text-xs font-semibold uppercase bg-app-orange text-white rounded-full">
                      {product.discount}% OFF
                    </span>
                  )}
                  {product.isOrganic && (
                    <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-green-700 text-white rounded-full">
                      <LeafIcon className="size-3" /> Organic
                    </span>
                  )}
                </div>

                {/* Image counter */}
                {images.length > 1 && (
                  <span className="absolute top-3 right-3 px-2 py-0.5 text-xs font-semibold bg-black/40 text-white rounded-full">
                    {index + 1} / {images.length}
                  </span>
                )}

                {/* Carousel nav */}
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={prev}
                      className="absolute left-3 top-1/2 -translate-y-1/2 size-9 rounded-full bg-white/90 shadow flex items-center justify-center text-app-green hover:bg-white transition-colors"
                      aria-label="Previous product image"
                    >
                      <ChevronLeftIcon className="size-5" />
                    </button>
                    <button
                      type="button"
                      onClick={next}
                      className="absolute right-3 top-1/2 -translate-y-1/2 size-9 rounded-full bg-white/90 shadow flex items-center justify-center text-app-green hover:bg-white transition-colors"
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

              {/* Thumbnail strip */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto p-4" style={{ scrollbarWidth: "none" }}>
                  {images.map((url, i) => (
                    <button
                      key={`${url}-${i}`}
                      type="button"
                      onClick={() => setIndex(i)}
                      className={`size-14 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                        i === index
                          ? "border-app-green ring-2 ring-app-green/20"
                          : "border-app-border opacity-70 hover:opacity-100"
                      }`}
                      aria-label={`Show ${product.name} image ${i + 1}`}
                      aria-current={i === index ? "true" : undefined}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details column */}
            <div className="p-5 sm:p-6 space-y-5">
              {/* Store + View link */}
              {product.store?.name && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-app-text-light flex items-center gap-1.5">
                    <StoreIcon className="size-4 shrink-0" />
                    {product.store.name}
                  </p>
                  {storeId && (
                    <Link
                      to={`/stores/${storeId}`}
                      onClick={onClose}
                      className="text-xs font-semibold text-app-orange hover:text-app-orange-dark flex items-center gap-0.5 transition-colors shrink-0 ml-2"
                    >
                      View store <ArrowUpRightIcon className="size-3" />
                    </Link>
                  )}
                </div>
              )}

              {/* Price row */}
              <div className="space-y-1.5">
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

                {/* Stock + rating */}
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${stockBadgeClass(product.stock)}`}
                  >
                    {stockLabel(product.stock)}
                  </span>
                  {product.rating > 0 && (
                    <span className="flex items-center gap-1 text-xs font-medium text-app-text">
                      <StarIcon className="size-3.5 text-app-warning fill-app-warning" />
                      {product.rating}
                      <span className="text-app-text-light">({product.reviewCount})</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Delivery info row — derived from real store fields */}
              {(eta || deliveryFeeLabel || minOrderLabel) && (
                <div className="rounded-xl bg-app-cream/60 px-3 py-2.5 space-y-1.5">
                  {eta && (
                    <p className="text-xs text-app-text-light flex items-center gap-1.5">
                      <ClockIcon className="size-3.5 shrink-0 text-app-green" />
                      Est. delivery {eta}
                    </p>
                  )}
                  {(deliveryFeeLabel || minOrderLabel) && (
                    <p className="text-xs text-app-text-light flex items-center gap-1.5">
                      <TruckIcon className="size-3.5 shrink-0 text-app-green" />
                      {[deliveryFeeLabel, minOrderLabel].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              )}

              {/* Description */}
              <section>
                <h3 className="text-sm font-semibold text-app-green mb-1.5">
                  Description
                </h3>
                <p className="text-sm leading-6 text-app-text-light whitespace-pre-line">
                  {product.description || "No description has been added yet."}
                </p>
              </section>

              {/* Specifications */}
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

              {/* Product info chips */}
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
                      <p className="text-sm font-medium text-app-text truncate">{value}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Support placeholder — general, not misleading */}
              <section className="rounded-xl border border-app-border px-3 py-2.5">
                <p className="text-xs text-app-text-light flex items-start gap-1.5">
                  <MessageCircleIcon className="size-3.5 shrink-0 mt-0.5 text-app-text-light" />
                  <span>
                    For returns or issues with your order, contact the store or
                    reach out to{" "}
                    <span className="font-medium text-app-green">
                      Zembil Market support
                    </span>
                    .
                  </span>
                </p>
              </section>
            </div>
          </div>
        </div>

        {/* Sticky footer — quantity + add to cart */}
        <div className="px-5 sm:px-6 py-4 border-t border-app-border flex flex-col sm:flex-row gap-3 sm:items-center shrink-0 bg-white">
          <div className="flex items-center justify-between sm:justify-start gap-3">
            <span className="text-sm font-medium text-app-text">Quantity</span>
            <div className="inline-flex items-center rounded-xl border border-app-border overflow-hidden">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="size-10 flex items-center justify-center hover:bg-app-cream disabled:opacity-40 transition-colors"
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
              >
                <MinusIcon className="size-4" />
              </button>
              <span className="w-10 text-center text-sm font-semibold select-none">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                className="size-10 flex items-center justify-center hover:bg-app-cream disabled:opacity-40 transition-colors"
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
            className="flex-1 py-3 bg-app-orange text-white font-semibold rounded-xl hover:bg-app-orange-dark transition-colors active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60"
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
