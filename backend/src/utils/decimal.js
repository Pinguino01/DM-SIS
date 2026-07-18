import Decimal from "decimal.js";

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export function toDecimal(value) {
  return new Decimal(value || 0);
}

export function money(value) {
  return toDecimal(value).toDecimalPlaces(4).toString();
}

export function sum(values) {
  return values.reduce((acc, value) => acc.plus(toDecimal(value)), new Decimal(0));
}
