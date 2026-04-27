import type { Card } from "@/lib/types";

export function clampUrgencyScore(value: unknown): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  const n = Math.round(value);
  if (n < 1 || n > 10) return null;
  return n;
}

export function clampUrgencyScoreOrDefault(value: unknown, fallback = 5): number {
  return clampUrgencyScore(value) ?? fallback;
}

/** Yüksek önce; urgency yoksa sütunda mevcut position sırası korunur (en alta yakın). */
export function sortCardsByUrgencyScoreDesc(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    const ua = typeof a.urgency_score === "number" ? a.urgency_score : null;
    const ub = typeof b.urgency_score === "number" ? b.urgency_score : null;
    if (ua === null && ub === null) return a.position - b.position;
    if (ua === null) return 1;
    if (ub === null) return -1;
    if (ub !== ua) return ub - ua;
    return a.position - b.position;
  });
}

export type UrgencyBand = "high" | "medium" | "low";

export function getUrgencyBand(score: number): UrgencyBand {
  if (score >= 8) return "high";
  if (score >= 5) return "medium";
  return "low";
}

export function urgencyBadgeClass(band: UrgencyBand): string {
  if (band === "high") {
    return "bg-[#FFC1C1] text-[#7A1A35] ring-1 ring-[#f0a8a8] dark:bg-[#5c2230] dark:text-[#ffd6dc] dark:ring-[#7a3344]";
  }
  if (band === "medium") {
    return "bg-[#FFF0C1] text-[#5C4A00] ring-1 ring-[#e8d89a] dark:bg-[#4a4020] dark:text-[#fff3c4] dark:ring-[#6b5a2a]";
  }
  return "bg-[#C1D9FF] text-[#1A3A5C] ring-1 ring-[#a8c4f0] dark:bg-[#243a52] dark:text-[#d4e8ff] dark:ring-[#355a7a]";
}
