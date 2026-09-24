/** Abstände, Radien, Typografie — geteilt zwischen Web und Native. */

/** 4px-Raster. space(4) = 16px. */
export const space = (steps: number): number => steps * 4;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

export const typography = {
  /**
   * Zahlen im Gym müssen aus Armlänge lesbar sein — daher deutlich größer
   * als übliche Body-Größen.
   */
  gymMetric: { size: 32, weight: "700", lineHeight: 36 },
  gymMetricSmall: { size: 20, weight: "700", lineHeight: 24 },
  title: { size: 22, weight: "700", lineHeight: 28 },
  heading: { size: 17, weight: "600", lineHeight: 22 },
  body: { size: 15, weight: "400", lineHeight: 22 },
  caption: { size: 13, weight: "400", lineHeight: 18 },
  label: { size: 11, weight: "700", lineHeight: 14 },
} as const;
