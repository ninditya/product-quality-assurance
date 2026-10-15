/**
 * Money is compared in integer cents, so floating point never decides a test result.
 */

/** "$1,296.57", "$ 1525.38", "- $228.81" or "80.19" -> cents (always positive). */
export function toCents(text: string): number {
  const cleaned = text.replace(/[^0-9.]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new Error(`Cannot read a money amount from "${text}"`);
  }
  return Math.round(Number(cleaned) * 100);
}

/** API prices are numbers such as 80.19. */
export function priceToCents(price: number): number {
  return Math.round(price * 100);
}

/** 129657 -> "$1,296.57", the format the cart uses. */
export function formatCents(cents: number): string {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** A percentage of an amount, rounded half-up to the cent (assumption A6, not confirmed by the PO). */
export function percentOf(cents: number, percent: number): number {
  return Math.round((cents * percent) / 100);
}
