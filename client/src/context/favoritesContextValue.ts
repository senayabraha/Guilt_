import { createContext } from "react";

type FavoritesContextValue = {
  favoriteIds: Set<string>;
  loading: boolean;
  isFavorite: (productId?: string | null) => boolean;
  toggleFavorite: (productId?: string | null, productName?: string) => Promise<boolean>;
  refreshFavorites: () => Promise<void>;
};

export const FavoritesContext = createContext<FavoritesContextValue | undefined>(
  undefined,
);
