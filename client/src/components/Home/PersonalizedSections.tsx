import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRightIcon,
  ClockIcon,
  MapPinIcon,
  NavigationIcon,
  RefreshCwIcon,
  ShoppingBasketIcon,
  SparklesIcon,
  StoreIcon,
  TrendingUpIcon,
} from "lucide-react";

import type { Store, Order } from "../../types";
import StoreCard from "../StoreCard";
import { sortStoresByDistance } from "../../lib/geo";
import { formatCurrency } from "../../lib/format";
import { getMyOrders } from "../../lib/db/orders";
import { useAuth } from "../../context/AuthContext";
import type { SavedPin } from "../../lib/areas";

// localStorage key for recently viewed store IDs
const VIEWED_KEY = "zembil_recently_viewed";
const MAX_VIEWED = 8;

export function recordStoreView(storeId: string) {
  try {
    const prev: string[] = JSON.parse(localStorage.getItem(VIEWED_KEY) || "[]");
    const next = [storeId, ...prev.filter((id) => id !== storeId)].slice(
      0,
      MAX_VIEWED,
    );
    localStorage.setItem(VIEWED_KEY, JSON.stringify(next));
  } catch {}
}

function getViewedIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(VIEWED_KEY) || "[]");
  } catch {
    return [];
  }
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({
  icon: Icon,
  title,
  linkTo,
  linkLabel,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  linkTo?: string;
  linkLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-app-green flex items-center gap-1.5">
          <Icon className="size-4 text-app-orange" />
          {title}
        </h2>
        {linkTo && (
          <Link
            to={linkTo}
            className="text-xs font-semibold text-app-orange hover:text-app-orange-dark flex items-center gap-0.5"
          >
            {linkLabel ?? "See all"} <ArrowRightIcon className="size-3" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

// ─── Store horizontal scroll row ─────────────────────────────────────────────
function StoreScrollRow({
  stores,
  pin,
}: {
  stores: Store[];
  pin: SavedPin | null;
}) {
  return (
    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1">
      {stores.map((store) => (
        <StoreCard
          key={store.id}
          store={store}
          pin={pin}
          className="min-w-[240px] max-w-[240px] shrink-0"
        />
      ))}
    </div>
  );
}

// ─── Reorder card ─────────────────────────────────────────────────────────────
function ReorderCard({ order }: { order: Order }) {
  const storeName =
    typeof order.store === "object" && order.store ? order.store.name : "Store";
  const firstItem = order.items[0];
  const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <Link
      to={`/stores/${order.storeId ?? ""}`}
      className="bg-white rounded-2xl border border-app-border p-4 hover:shadow-md transition-all flex items-center gap-4 animate-fade-in"
    >
      <div className="size-14 rounded-xl bg-app-cream overflow-hidden shrink-0 flex-center">
        {firstItem?.image ? (
          <img
            src={firstItem.image}
            alt={firstItem.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <ShoppingBasketIcon className="size-6 text-app-green" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-900 truncate">
          {storeName}
        </p>
        <p className="text-xs text-zinc-500 truncate mt-0.5">
          {firstItem?.name}
          {itemCount > 1 ? ` +${itemCount - 1} more` : ""}
        </p>
        <p className="text-xs text-app-text-light mt-0.5">
          {formatCurrency(order.total)}
        </p>
      </div>
      <div className="shrink-0">
        <span className="px-3 py-1.5 bg-app-orange text-white text-xs font-semibold rounded-full hover:bg-app-orange-dark transition-colors">
          Reorder
        </span>
      </div>
    </Link>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface Props {
  allStores: Store[];
  pin: SavedPin | null;
  onSetPin: () => void;
}

const PersonalizedSections = ({ allStores, pin, onSetPin }: Props) => {
  const { user } = useAuth();
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [recentlyViewedStores, setRecentlyViewedStores] = useState<Store[]>([]);

  // Load last order for authenticated users
  useEffect(() => {
    if (!user) return;
    getMyOrders()
      .then((orders) => {
        const delivered = orders.find((o) => o.status === "Delivered");
        if (delivered) setLastOrder(delivered);
      })
      .catch(() => {});
  }, [user]);

  // Map recently viewed IDs to store objects
  useEffect(() => {
    const ids = getViewedIds();
    if (ids.length === 0 || allStores.length === 0) return;
    const mapped = ids
      .map((id) => allStores.find((s) => s.id === id))
      .filter(Boolean) as Store[];
    setRecentlyViewedStores(mapped);
  }, [allStores]);

  // Sections derived from stores
  const nearbyStores = pin
    ? sortStoresByDistance(allStores, pin).slice(0, 6)
    : [];
  const openStores = allStores.filter((s) => s.isOpen);
  const newStores = [...allStores]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 6);
  const popularStores = allStores.filter((s) => s.isOpen).slice(0, 6);

  return (
    <div>
      {/* Reorder from last order */}
      {user && lastOrder && (
        <Section
          icon={RefreshCwIcon}
          title="Reorder from your last order"
          linkTo="/orders"
          linkLabel="View orders"
        >
          <ReorderCard order={lastOrder} />
        </Section>
      )}

      {/* Recently viewed */}
      {recentlyViewedStores.length > 0 && (
        <Section
          icon={ClockIcon}
          title="Recently viewed"
          linkTo="/stores"
          linkLabel="See all"
        >
          <StoreScrollRow stores={recentlyViewedStores} pin={pin} />
        </Section>
      )}

      {/* Nearby stores or pin prompt */}
      {pin ? (
        nearbyStores.length > 0 && (
          <Section
            icon={NavigationIcon}
            title="Stores near you"
            linkTo="/stores?nearby=1"
            linkLabel="See all nearby"
          >
            <StoreScrollRow stores={nearbyStores} pin={pin} />
          </Section>
        )
      ) : (
        <section className="mb-8">
          <div className="rounded-2xl border border-dashed border-app-border bg-white px-5 py-7 flex flex-col sm:flex-row items-center gap-4">
            <div className="size-12 rounded-2xl bg-app-green/10 flex-center shrink-0 text-app-green">
              <NavigationIcon className="size-6" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <p className="text-sm font-semibold text-app-green">
                See stores near you
              </p>
              <p className="text-xs text-app-text-light mt-0.5">
                Set a location pin from Nearby Stores to discover what's close
                to you.
              </p>
            </div>
            <button
              onClick={onSetPin}
              className="shrink-0 px-4 py-2 rounded-full bg-app-green text-white text-sm font-semibold hover:bg-app-green-light transition-colors flex items-center gap-1.5"
            >
              <MapPinIcon className="size-3.5" /> Set location
            </button>
          </div>
        </section>
      )}

      {/* Open stores now */}
      {openStores.length > 0 && (
        <Section
          icon={StoreIcon}
          title="Open now"
          linkTo="/stores"
          linkLabel="All stores"
        >
          <StoreScrollRow stores={openStores.slice(0, 6)} pin={pin} />
        </Section>
      )}

      {/* Popular near you / Popular stores */}
      {popularStores.length > 0 && (
        <Section
          icon={TrendingUpIcon}
          title={pin ? "Popular near your area" : "Popular stores"}
          linkTo="/stores"
          linkLabel="See all"
        >
          <StoreScrollRow stores={popularStores} pin={pin} />
        </Section>
      )}

      {/* New stores */}
      {newStores.length > 0 && (
        <Section
          icon={SparklesIcon}
          title="New stores"
          linkTo="/stores"
          linkLabel="Browse all"
        >
          <StoreScrollRow stores={newStores} pin={pin} />
        </Section>
      )}
    </div>
  );
};

export default PersonalizedSections;
