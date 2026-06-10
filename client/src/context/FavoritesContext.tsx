import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { useAuth } from "./AuthContext";
import {
  getFavoriteProductIds,
  saveProduct,
  unsaveProduct,
} from "../lib/db/favorites";
import { FavoritesContext } from "./favoritesContextValue";

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [favoriteIdsList, setFavoriteIdsList] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const userId = user?.id || user?._id;

  const favoriteIds = useMemo(
    () => (userId ? new Set(favoriteIdsList) : new Set<string>()),
    [favoriteIdsList, userId],
  );

  const refreshFavorites = async () => {
    if (!userId) {
      setFavoriteIdsList([]);
      return;
    }
    setLoading(true);
    try {
      setFavoriteIdsList(await getFavoriteProductIds());
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load saved items";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    void Promise.resolve().then(() => refreshFavorites());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const isFavorite = (productId?: string | null) =>
    Boolean(productId && favoriteIds.has(productId));

  const toggleFavorite = async (
    productId?: string | null,
    productName = "product",
  ) => {
    if (!productId) return false;
    if (!userId) {
      toast.error("Sign in to save products.");
      navigate("/login", {
        state: { redirectTo: `${location.pathname}${location.search}` },
      });
      return false;
    }

    const currentlySaved = favoriteIds.has(productId);
    setFavoriteIdsList((ids) =>
      currentlySaved ? ids.filter((id) => id !== productId) : [productId, ...ids],
    );

    try {
      if (currentlySaved) {
        await unsaveProduct(productId);
        toast.success(`${productName} removed from saved items`);
      } else {
        await saveProduct(productId, userId);
        toast.success(`${productName} saved`);
      }
      return !currentlySaved;
    } catch (error: unknown) {
      await refreshFavorites();
      const message = error instanceof Error ? error.message : "Failed to update saved item";
      toast.error(message);
      return currentlySaved;
    }
  };

  return (
    <FavoritesContext.Provider
      value={{
        favoriteIds,
        loading,
        isFavorite,
        toggleFavorite,
        refreshFavorites,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}
