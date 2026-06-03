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

export function getSavedArea(): string {
  if (typeof window === "undefined") return "Addis Ababa";
  return localStorage.getItem(STORAGE_KEY) || "Addis Ababa";
}

export function saveArea(area: string): void {
  if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, area);
}
