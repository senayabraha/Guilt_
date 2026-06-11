import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { heroSectionData } from "../../assets/assets";

interface Banner {
  id: string;
  headline: string;
  sub: string;
  cta: string;
  to: string;
  gradient: string;
  badge?: string;
}

const BANNERS: Banner[] = [
  {
    id: "fresh",
    headline: "Fresh produce, daily",
    sub: "Locally sourced fruits & vegetables from stores near you.",
    cta: "Shop produce",
    to: "/products?category=fruits-vegetables",
    gradient: "from-green-800 via-green-700/70 to-green-600/30",
    badge: "Fresh & Local",
  },
  {
    id: "household",
    headline: "Household essentials",
    sub: "Everything your home needs, delivered fast.",
    cta: "Shop now",
    to: "/products?category=household-essentials",
    gradient: "from-app-green via-app-green/70 to-app-green/30",
    badge: "Stock up",
  },
  {
    id: "deals",
    headline: "Best deals today",
    sub: "Discover discounts across all categories.",
    cta: "View deals",
    to: "/deals",
    gradient: "from-orange-700 via-orange-600/70 to-orange-500/30",
    badge: "Limited time",
  },
  {
    id: "local",
    headline: "Shop local favorites",
    sub: "Support nearby stores in Addis Ababa.",
    cta: "Browse stores",
    to: "/stores",
    gradient: "from-app-green via-app-green/60 to-transparent",
    badge: "Community picks",
  },
  {
    id: "weekend",
    headline: "Weekend special",
    sub: "Free delivery on orders above ETB 500 this weekend.",
    cta: "Order now",
    to: "/stores",
    gradient: "from-indigo-800 via-indigo-700/70 to-indigo-600/30",
    badge: "Free delivery",
  },
];

const PromoBanners = () => {
  const [active, setActive] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActive((prev) => (prev + 1) % BANNERS.length);
    }, 5000);
  };

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goTo = (idx: number) => {
    setActive(idx);
    startTimer();
  };

  const prev = () => goTo((active - 1 + BANNERS.length) % BANNERS.length);
  const next = () => goTo((active + 1) % BANNERS.length);

  const banner = BANNERS[active];

  return (
    <section className="relative overflow-hidden rounded-2xl mb-8">
      {/* Background image */}
      <img
        src={heroSectionData.hero_image}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Gradient overlay — changes per banner */}
      <div
        key={banner.id}
        className={`absolute inset-0 bg-gradient-to-r ${banner.gradient} transition-all duration-500`}
      />

      {/* Content */}
      <Link
        to={banner.to}
        className="relative block px-5 py-7 sm:px-8 sm:py-10 group"
        aria-label={`${banner.headline} — ${banner.cta}`}
      >
        {banner.badge && (
          <span className="inline-flex items-center px-3 py-1 text-[11px] font-semibold text-orange-300 bg-orange-300/10 rounded-full mb-3">
            {banner.badge}
          </span>
        )}

        <h2 className="font-serif text-2xl sm:text-3xl text-white leading-tight mb-2 group-hover:underline underline-offset-4">
          {banner.headline}
        </h2>

        <p className="text-sm text-white/80 leading-relaxed max-w-sm mb-4">
          {banner.sub}
        </p>

        <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/15 hover:bg-white/25 text-white text-sm font-semibold rounded-full transition-colors border border-white/20">
          {banner.cta} <ChevronRightIcon className="size-3.5" />
        </span>
      </Link>

      {/* Prev / Next arrows */}
      <button
        type="button"
        onClick={prev}
        className="absolute left-3 top-1/2 -translate-y-1/2 size-8 rounded-full bg-black/25 hover:bg-black/40 text-white flex-center transition-colors"
        aria-label="Previous banner"
      >
        <ChevronLeftIcon className="size-4" />
      </button>
      <button
        type="button"
        onClick={next}
        className="absolute right-3 top-1/2 -translate-y-1/2 size-8 rounded-full bg-black/25 hover:bg-black/40 text-white flex-center transition-colors"
        aria-label="Next banner"
      >
        <ChevronRightIcon className="size-4" />
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
        {BANNERS.map((b, i) => (
          <button
            key={b.id}
            type="button"
            onClick={() => goTo(i)}
            className={`rounded-full transition-all ${
              i === active
                ? "w-5 h-1.5 bg-white"
                : "size-1.5 bg-white/40 hover:bg-white/70"
            }`}
            aria-label={`Banner ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
};

export default PromoBanners;
