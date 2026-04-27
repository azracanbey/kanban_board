import type { PastelName } from "@/lib/pastelPalette";

export { PASTEL } from "@/lib/pastelPalette";

/**
 * Top border accents (6 soft pastels). Column/card bodies use app-card / app-column; text uses --app-text.
 * Tailwind needs full string literals in source for generation.
 */
const TOP_BORDER = [
  "border-t-4 border-t-[#C1FFFF]",
  "border-t-4 border-t-[#C1C7FF]",
  "border-t-4 border-t-[#FFC1C1]",
  "border-t-4 border-t-[#FFF0C1]",
  "border-t-4 border-t-[#CEFFC1]",
  "border-t-4 border-t-[#FFD1DD]",
] as const;

/** Sütun başlık alanı arka planı — `TOP_BORDER` ile aynı sıra. */
const COLUMN_PASTEL_HEX = [
  "#C1FFFF",
  "#C1C7FF",
  "#FFC1C1",
  "#FFF0C1",
  "#CEFFC1",
  "#FFD1DD",
] as const;

export function getColumnPastelHex(columnIndex: number): string {
  return COLUMN_PASTEL_HEX[columnIndex % COLUMN_PASTEL_HEX.length] ?? COLUMN_PASTEL_HEX[0];
}

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) {
    h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Kart: beyaz (light) / app-card (dark) + üstte pastel vurgu. */
export function getCardTopAccent(cardId: string): string {
  const i = hashId(cardId) % TOP_BORDER.length;
  return TOP_BORDER[i] ?? TOP_BORDER[0];
}

const PASTEL_ORDER: PastelName[] = [
  "ice",
  "periwinkle",
  "coral",
  "cream",
  "mint",
  "blush",
];

export function getPastelNameForIndex(i: number): PastelName {
  return PASTEL_ORDER[i % PASTEL_ORDER.length] ?? "ice";
}
