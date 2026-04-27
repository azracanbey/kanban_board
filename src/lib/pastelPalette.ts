/**
 * Soft pastel palette (reference — use via globals :root for accents).
 * #FFC1C1 #FFF0C1 #CEFFC1 #C1FFFF #C1C7FF #FFD1DD
 */
export const PASTEL = {
  coral: "#FFC1C1",
  cream: "#FFF0C1",
  mint: "#CEFFC1",
  ice: "#C1FFFF",
  periwinkle: "#C1C7FF",
  blush: "#FFD1DD",
} as const;

export type PastelName = keyof typeof PASTEL;
