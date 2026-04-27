import type { SupabaseClient } from "@supabase/supabase-js";
import type { Card } from "@/lib/types";
import { sortCardsByUrgencyScoreDesc } from "@/lib/urgencyScore";

const CARD_SELECT =
  "id, column_id, title, description, position, created_at, urgency_score" as const;

/**
 * Sütundaki kartları aciliyete göre sıralayıp position değerlerini veritabanına yazar.
 * Güncellenmiş kart listesini döner.
 */
export async function persistColumnUrgencyOrder(
  supabase: SupabaseClient,
  columnId: string,
): Promise<Card[] | null> {
  try {
    const { data: rows, error } = await supabase
      .from("cards")
      .select(CARD_SELECT)
      .eq("column_id", columnId);

    if (error || !rows?.length) {
      return error ? null : [];
    }

    const sorted = sortCardsByUrgencyScoreDesc(rows as Card[]);

    for (let i = 0; i < sorted.length; i++) {
      const position = (i + 1) * 1000;
      const { error: upErr } = await supabase
        .from("cards")
        .update({ position })
        .eq("id", sorted[i].id);
      if (upErr) {
        console.error("persistColumnUrgencyOrder update:", upErr.message);
        return null;
      }
    }

    const { data: refreshed, error: refErr } = await supabase
      .from("cards")
      .select(CARD_SELECT)
      .eq("column_id", columnId)
      .order("position", { ascending: true });

    if (refErr) {
      return null;
    }

    return (refreshed ?? []) as Card[];
  } catch (e) {
    console.error("persistColumnUrgencyOrder:", e instanceof Error ? e.message : e);
    return null;
  }
}
