// Addis Ababa delivery areas used for the location selector and placeholders.
// For now this is a UI/local-state concern only — no geolocation yet.
export const ADDIS_AREAS = [
  "Addis Ababa",
  "Bole",
  "Kazanchis",
  "Piassa",
  "Megenagna",
  "CMC",
  "Sarbet",
  "Ayat",
  "Mexico",
  "4 Kilo",
  "6 Kilo",
] as const;

export type AddisArea = (typeof ADDIS_AREAS)[number];

const STORAGE_KEY = "zembil_delivery_area";
const PIN_KEY = "zembil_delivery_pin";

export function getSavedArea(): string {
  if (typeof window === "undefined") return "Addis Ababa";
  return localStorage.getItem(STORAGE_KEY) || "Addis Ababa";
}

export function saveArea(area: string): void {
  if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, area);
}

// Default Addis Ababa map center.
export const ADDIS_CENTER = { lat: 9.03, lng: 38.74 };

export interface SavedPin {
  lat: number;
  lng: number;
}

// A browsing-time delivery pin saved in localStorage (used for "nearby"
// sorting even when the user is not logged in).
export function getSavedPin(): SavedPin | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PIN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.lat === "number" && typeof parsed?.lng === "number") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function savePin(pin: SavedPin): void {
  if (typeof window !== "undefined")
    localStorage.setItem(PIN_KEY, JSON.stringify(pin));
}
