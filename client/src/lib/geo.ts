import type { Store } from "../types";

export interface Coords {
  lat: number;
  lng: number;
}

// Haversine distance in kilometers between two lat/lng points.
export function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

const hasCoords = (s: Store) =>
  typeof s.lat === "number" &&
  typeof s.lng === "number" &&
  !(s.lat === 0 && s.lng === 0);

// Sort stores by distance from `coords`. Stores without coordinates are kept
// but pushed to the end so the list never crashes or loses entries.
export function sortStoresByDistance(stores: Store[], coords: Coords): Store[] {
  return [...stores].sort((a, b) => {
    const aHas = hasCoords(a);
    const bHas = hasCoords(b);
    if (aHas && bHas) {
      return (
        calculateDistanceKm(coords.lat, coords.lng, a.lat!, a.lng!) -
        calculateDistanceKm(coords.lat, coords.lng, b.lat!, b.lng!)
      );
    }
    if (aHas) return -1;
    if (bHas) return 1;
    return 0;
  });
}

// Distance label for a store relative to coords, or null if not computable.
export function storeDistanceLabel(
  store: Store,
  coords: Coords | null,
): string | null {
  if (!coords || !hasCoords(store)) return null;
  const km = calculateDistanceKm(coords.lat, coords.lng, store.lat!, store.lng!);
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}
