/** CO2 scale from best (A) to worst (E), as the badge tooltip in the app explains it. */
export const CO2_SCALE = ['A', 'B', 'C', 'D', 'E'] as const;
export type Co2Rating = (typeof CO2_SCALE)[number];

/** D1: "better than E" means any rating ranked above E, i.e. A, B, C or D. */
export function isBetterThan(rating: string, threshold: Co2Rating): boolean {
  const index = CO2_SCALE.indexOf(rating as Co2Rating);
  if (index === -1) throw new Error(`Unknown CO2 rating "${rating}"`);
  return index < CO2_SCALE.indexOf(threshold);
}
