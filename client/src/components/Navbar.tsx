import {
  ArrowUpRightIcon,
  ChevronDownIcon,
  LogOutIcon,
  MapPinIcon,
  MenuIcon,
  PackageIcon,
  HeartIcon,
  SearchIcon,
  ShieldIcon,
  ShoppingBasketIcon,
  ShoppingCartIcon,
  StoreIcon,
  UserIcon,
  XIcon,
} from "lucide-react";
import React, { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import NotificationsDropdown from "./NotificationsDropdown";

const Navbar = () => {
  const { user, logout } = useAuth();
  const { cartCount, setIsCartOpen } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileQuery, setMobileQuery] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  const handleMobileSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = mobileQuery.trim();
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
      setMobileQuery("");
      setMobileSearchOpen(false);
    }
  };

  const toggleMobileSearch = () => {
    setMobileSearchOpen((prev) => {
      if (!prev) setTimeout(() => mobileInputRef.current?.focus(), 50);
      return !prev;
    });
  };

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    navigate("/");
  };

  return (
    <nav className="bg-white sticky top-0 z-50 border-b border-app-border">
      {/* Main row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 gap-4">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-1.5 text-[22px] font-semibold shrink-0 text-app-green"
        >
          <span className="relative">
            <ShoppingBasketIcon size={26} className="text-app-green" />
            <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-app-orange" />
          </span>
          Zembil Market
        </Link>

        <div className="w-full flex items-center justify-end gap-4 lg:gap-10">
          {/* Nav Links — desktop */}
          <div className="hidden md:flex items-center gap-6 text-sm text-zinc-600">
            <Link to="/">Home</Link>
            <Link to="/products">Products</Link>
            <Link to="/stores">Stores</Link>
            <Link to="/deals" className="text-app-orange">
              Deals
            </Link>
          </div>

          {/* Search bar — sm and up */}
          <form
            onSubmit={handleSearch}
            className="hidden sm:flex flex-1 max-w-sm text-xs sm:text-sm"
          >
            <div className="relative w-full">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search stores and groceries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 p-2 bg-orange-50 rounded-full ring ring-app-orange/15 focus:ring-app-orange/30 outline-none"
              />
            </div>
          </form>

          {/* Right actions */}
          <div className="flex items-center gap-1">
            {/* Mobile search toggle — hidden on sm+ */}
            <button
              className="sm:hidden p-2 rounded-xl hover:bg-app-cream transition-colors"
              onClick={toggleMobileSearch}
              aria-label={mobileSearchOpen ? "Close search" : "Search"}
            >
              {mobileSearchOpen ? (
                <XIcon className="size-5 text-zinc-700" />
              ) : (
                <SearchIcon className="size-5 text-zinc-700" />
              )}
            </button>

            {/* Cart */}
            <button
              className="relative p-2 rounded-xl hover:bg-app-cream transition-colors"
              onClick={() => setIsCartOpen(true)}
              aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ""}`}
            >
              <ShoppingCartIcon className="size-5 text-zinc-900" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 size-4 bg-app-orange text-white text-[10px] rounded-full flex-center">
                  {cartCount}
                </span>
              )}
            </button>

            <NotificationsDropdown />

            {/* User menu */}
            <div className="relative">
              {user ? (
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-2"
                >
                  <div className="size-7 rounded-full bg-green-950 text-white flex-center text-xs font-semibold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <ChevronDownIcon className="size-3 text-zinc-500 hidden sm:block" />
                </button>
              ) : (
                <div className="flex-center gap-2">
                  <Link
                    to="/login"
                    className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-950 rounded-full hover:opacity-90 transition-opacity"
                  >
                    <UserIcon size={16} /> Sign In
                  </Link>
                  <button
                    className="md:hidden p-2 rounded-xl hover:bg-app-cream transition-colors"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    aria-label="Menu"
                  >
                    {userMenuOpen ? (
                      <XIcon className="size-5" />
                    ) : (
                      <MenuIcon className="size-5" />
                    )}
                  </button>
                </div>
              )}

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2.5 w-56 bg-white rounded-xl shadow-lg border border-app-border py-2 z-50 animate-fade-in">
                    {user && (
                      <div className="px-4 py-2 border-b border-app-border">
                        <p className="text-sm font-medium text-zinc-900">
                          {user.name}
                        </p>
                        <p className="text-xs text-zinc-500">{user.email}</p>
                      </div>
                    )}
                    <div onClick={() => setUserMenuOpen(false)}>
                      {!user && (
                        <Link to="/login" className="dropdown-link">
                          <UserIcon size={16} /> Sign In
                        </Link>
                      )}
                      {user && (
                        <Link to="/orders" className="dropdown-link">
                          <PackageIcon size={16} /> My Orders
                        </Link>
                      )}
                      {user && (
                        <Link to="/saved" className="dropdown-link">
                          <HeartIcon size={16} /> Saved Items
                        </Link>
                      )}
                      {user && (
                        <Link to="/addresses" className="dropdown-link">
                          <MapPinIcon size={16} /> Addresses
                        </Link>
                      )}
                      <Link to="/products" className="dropdown-link md:hidden">
                        <ArrowUpRightIcon size={16} /> Products
                      </Link>
                      <Link to="/stores" className="dropdown-link md:hidden">
                        <ArrowUpRightIcon size={16} /> Stores
                      </Link>
                      <Link to="/deals" className="dropdown-link md:hidden">
                        <ArrowUpRightIcon size={16} /> Deals
                      </Link>
                      {user &&
                        (user.role === "VENDOR" ? (
                          <Link to="/vendor" className="dropdown-link">
                            <StoreIcon size={16} /> Store Dashboard
                          </Link>
                        ) : (
                          !user.isAdmin && (
                            <Link to="/vendor/apply" className="dropdown-link">
                              <StoreIcon size={16} /> Open Your Store
                            </Link>
                          )
                        ))}
                      {user?.isAdmin && (
                        <Link to="/admin/products" className="dropdown-link">
                          <ShieldIcon className="text-app-orange-dark" size={16} />
                          <span className="text-app-orange-dark">Admin Panel</span>
                        </Link>
                      )}
                      {user && (
                        <div className="border-t border-app-border pt-1">
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-app-error hover:bg-red-50 w-full transition-colors"
                          >
                            <LogOutIcon size={16} /> Logout
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile search row — slides in below main nav */}
      {mobileSearchOpen && (
        <div className="sm:hidden px-4 pb-3 pt-2 bg-white border-t border-app-border">
          <form onSubmit={handleMobileSearch}>
            <div className="relative">
              <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
              <input
                ref={mobileInputRef}
                type="search"
                placeholder="Search products and stores…"
                value={mobileQuery}
                onChange={(e) => setMobileQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-orange-50 rounded-xl ring ring-app-orange/15 focus:ring-app-orange/30 outline-none text-sm"
              />
              {mobileQuery && (
                <button
                  type="button"
                  onClick={() => setMobileQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  aria-label="Clear search"
                >
                  <XIcon className="size-4" />
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
