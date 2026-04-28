import type { SupabaseClient } from "@supabase/supabase-js";
import { CARD_SELECT_WITH_AI_MAGIC, isMissingAiMagicAppliedColumn, selectCardsByColumnId } from "@/lib/cardsQuery";
import type { Card } from "@/lib/types";
import { sortCardsByUrgencyScoreDesc } from "@/lib/urgencyScore";

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
      .select(CARD_SELECT_WITH_AI_MAGIC)
      .eq("column_id", columnId);

    let sourceRows = (rows ?? []) as Card[];
    if (isMissingAiMagicAppliedColumn(error)) {
      const fallback = await selectCardsByColumnId(supabase, columnId);
      if (fallback.error || !fallback.data.length) {
        return fallback.error ? null : [];
      }
      sourceRows = fallback.data;
    } else if (error || !rows?.length) {
      return error ? null : [];
    }

    const sorted = sortCardsByUrgencyScoreDesc(sourceRows);

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

    const { data: refreshed, error: refErr } = await selectCardsByColumnId(supabase, columnId);

    if (refErr) {
      return null;
    }

    return refreshed;
  } catch (e) {
    console.error("persistColumnUrgencyOrder:", e instanceof Error ? e.message : e);
    return null;
  }
}
