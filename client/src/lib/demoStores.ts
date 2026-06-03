// Onboarding/demo placeholders shown only when no real stores exist yet.
// These are NOT inserted into the database — they guide admins/vendors to seed
// real stores and keep the marketplace from looking empty or broken.
export interface DemoStore {
  name: string;
  area: string;
  estimate: string;
  tag: string;
}

export const DEMO_STORES: DemoStore[] = [
  { name: "Bole Fresh Market", area: "Bole", estimate: "30–45 min", tag: "Fresh produce" },
  { name: "Kazanchis Grocery", area: "Kazanchis", estimate: "25–40 min", tag: "Everyday essentials" },
  { name: "Megenagna Mini Market", area: "Megenagna", estimate: "35–50 min", tag: "Local store" },
  { name: "CMC Family Store", area: "CMC", estimate: "30–45 min", tag: "Household" },
  { name: "Piassa Essentials", area: "Piassa", estimate: "30–45 min", tag: "Pantry staples" },
  { name: "Sarbet Fresh Basket", area: "Sarbet", estimate: "25–40 min", tag: "Fresh produce" },
];
