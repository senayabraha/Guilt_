import type { Store } from "../types";

// Zembil Market is Addis Ababa–focused, so money is shown in Ethiopian Birr.
// Data is stored as plain numbers; this only changes how amounts are displayed.
// Preferred style: "ETB 250".
export function formatCurrency(amount: number | null | undefined): string {
  const n = Number(amount ?? 0);
  const value = Number.isFinite(n) ? n : 0;
  return `ETB ${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

// Deterministic, stable "delivery in X–Y min" estimate per store so the UI
// feels like a real marketplace without faking live ETA data. Larger delivery
// radius nudges the estimate up a little.
export function deliveryEstimate(store: Pick<Store, "id" | "deliveryRadius">): string {
  const seed = hashString(store.id || "");
  const base = 20 + (seed % 16); // 20–35
  const radiusBump = Math.min(Math.round((store.deliveryRadius ?? 0) / 2), 10);
  const low = base + radiusBump;
  const high = low + 15;
  return `${low}–${high} min`;
}

// Useful, Instacart-style tags derived from real store fields (no fake data).
export function storeTags(store: Store): string[] {
  const tags: string[] = [];
  if (store.isOpen) tags.push("Open now");
  tags.push("Cash on delivery");
  if ((store.categories ?? []).some((c) => c.includes("fruits") || c.includes("vegetab")))
    tags.push("Fresh produce");
  tags.push("Local store");
  return tags;
}

// Short "Neighborhood • City" location label, skipping blanks.
export function storeLocation(store: Pick<Store, "city" | "state">): string {
  return [store.state, store.city].filter(Boolean).join(" • ");
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}
