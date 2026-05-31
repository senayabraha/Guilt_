// Currency helpers for the Addis Ababa marketplace.
// Amounts are stored and priced in Ethiopian Birr (ETB).

export const CURRENCY_SYMBOL = import.meta.env.VITE_CURRENCY_SYMBOL || "Br";

// Format a numeric amount with the Birr symbol, e.g. 1250 -> "Br 1,250.00"
export const formatCurrency = (amount: number, fractionDigits = 2): string => {
  const value = Number.isFinite(amount) ? amount : 0;
  return `${CURRENCY_SYMBOL} ${value.toLocaleString("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
};
