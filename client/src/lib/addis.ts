// Addis Ababa delivery zones (sub-cities) and Ethiopian phone validation.

export const ADDIS_SUBCITIES = [
  "Addis Ketema",
  "Akaky Kaliti",
  "Arada",
  "Bole",
  "Gullele",
  "Kirkos",
  "Kolfe Keranio",
  "Lideta",
  "Nifas Silk-Lafto",
  "Yeka",
  "Lemi Kura",
] as const;

export type AddisSubCity = (typeof ADDIS_SUBCITIES)[number];

// Accepts +2519XXXXXXXX, 2519XXXXXXXX, 09XXXXXXXX (mobile) and the 07XX range.
const ET_PHONE = /^(?:\+251|251|0)?(9|7)\d{8}$/;

export const isValidEthiopianPhone = (phone: string): boolean =>
  ET_PHONE.test(phone.replace(/[\s-]/g, ""));

// Normalize any accepted form to +2519XXXXXXXX
export const normalizeEthiopianPhone = (phone: string): string => {
  const digits = phone.replace(/[\s-]/g, "").replace(/^\+/, "");
  const local = digits.replace(/^251/, "").replace(/^0/, "");
  return `+251${local}`;
};
