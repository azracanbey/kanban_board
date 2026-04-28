import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type { Card } from "@/lib/types";

export const CARD_SELECT_WITH_AI_MAGIC =
  "id, column_id, title, description, position, created_at, urgency_score, ai_magic_applied" as const;

export const CARD_SELECT_BASE =
  "id, column_id, title, description, position, created_at, urgency_score" as const;

type SupabaseMaybeColumnError = Pick<PostgrestError, "code" | "message"> | null;

export function isMissingAiMagicAppliedColumn(error: SupabaseMaybeColumnError) {
  if (!error) {
    return false;
  }

  return (
    error.message.includes("ai_magic_applied") &&
    (error.code === "42703" ||
      error.code === "PGRST204" ||
      error.message.includes("column") ||
      error.message.includes("schema cache"))
  );
}

export function normalizeCard(row: Card): Card {
  return {
    ...row,
    ai_magic_applied: row.ai_magic_applied ?? false,
  };
}

export function stripAiMagicApplied<T extends { ai_magic_applied?: boolean }>(row: T) {
  const rest = { ...row };
  delete rest.ai_magic_applied;
  return rest;
}

export async function selectCardsByColumnIds(
  supabase: SupabaseClient,
  columnIds: string[],
): Promise<{ data: Card[]; error: PostgrestError | null }> {
  const withAi = await supabase
    .from("cards")
    .select(CARD_SELECT_WITH_AI_MAGIC)
    .in("column_id", columnIds)
    .order("position", { ascending: true });

  if (!isMissingAiMagicAppliedColumn(withAi.error)) {
    return {
      data: ((withAi.data ?? []) as Card[]).map(normalizeCard),
      error: withAi.error,
    };
  }

  const fallback = await supabase
    .from("cards")
    .select(CARD_SELECT_BASE)
    .in("column_id", columnIds)
    .order("position", { ascending: true });

  return {
    data: ((fallback.data ?? []) as Card[]).map(normalizeCard),
    error: fallback.error,
  };
}

export async function selectCardsByColumnId(
  supabase: SupabaseClient,
  columnId: string,
): Promise<{ data: Card[]; error: PostgrestError | null }> {
  const withAi = await supabase
    .from("cards")
    .select(CARD_SELECT_WITH_AI_MAGIC)
    .eq("column_id", columnId)
    .order("position", { ascending: true });

  if (!isMissingAiMagicAppliedColumn(withAi.error)) {
    return {
      data: ((withAi.data ?? []) as Card[]).map(normalizeCard),
      error: withAi.error,
    };
  }

  const fallback = await supabase
    .from("cards")
    .select(CARD_SELECT_BASE)
    .eq("column_id", columnId)
    .order("position", { ascending: true });

  return {
    data: ((fallback.data ?? []) as Card[]).map(normalizeCard),
    error: fallback.error,
  };
}
