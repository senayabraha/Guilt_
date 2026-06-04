import type { ComponentType } from "react";
import { Link } from "react-router-dom";
import {
  HomeIcon,
  LayoutGridIcon,
  NavigationIcon,
  PackageIcon,
  TagIcon,
} from "lucide-react";

// Instacart-style horizontal quick tabs. "Home" is the active tab here.
// "Categories" scrolls to the on-page category section; the rest navigate.
interface Tab {
  label: string;
  icon: ComponentType<{ className?: string }>;
  to?: string;
  scrollTo?: string;
  active?: boolean;
}

const tabs: Tab[] = [
  { label: "Home", icon: HomeIcon, to: "/", active: true },
  { label: "Nearby Stores", icon: NavigationIcon, to: "/stores?nearby=1" },
  { label: "Deals", icon: TagIcon, to: "/deals" },
  { label: "Categories", icon: LayoutGridIcon, scrollTo: "categories" },
  { label: "Orders", icon: PackageIcon, to: "/orders" },
];

const QuickTabs = () => {
  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const tabClass = (active?: boolean) =>
    `flex flex-col items-center gap-1.5 shrink-0 min-w-[64px] pb-2 border-b-2 transition-colors ${
      active
        ? "border-app-orange text-app-green"
        : "border-transparent text-app-text-light hover:text-app-green"
    }`;

  return (
    <section className="mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="flex gap-5 overflow-x-auto no-scrollbar border-b border-app-border">
        {tabs.map((tab) =>
          tab.scrollTo ? (
            <button
              key={tab.label}
              type="button"
              onClick={() => scrollToSection(tab.scrollTo!)}
              className={tabClass(tab.active)}
            >
              <tab.icon className="size-5" />
              <span className="text-xs font-medium whitespace-nowrap">{tab.label}</span>
            </button>
          ) : (
            <Link key={tab.label} to={tab.to!} className={tabClass(tab.active)}>
              <tab.icon className="size-5" />
              <span className="text-xs font-medium whitespace-nowrap">{tab.label}</span>
            </Link>
          ),
        )}
      </div>
    </section>
  );
};

export default QuickTabs;
