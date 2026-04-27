import type { SupabaseClient } from "@supabase/supabase-js";
import { getNextBoardPositionForUser } from "@/lib/nextBoardPosition";
import type { BoardTemplate } from "@/lib/templates";

/**
 * Board + şablon sütunları + örnek kartları sırayla oluşturur.
 */
export async function createBoardFromTemplate(
  supabase: SupabaseClient,
  userId: string,
  title: string,
  template: BoardTemplate,
): Promise<{ boardId: string; position: number } | { error: string }> {
  try {
    const position = await getNextBoardPositionForUser(supabase, userId);
    const { data: board, error: boardError } = await supabase
      .from("boards")
      .insert({ title, user_id: userId, position })
      .select("id, title, created_at, user_id, position")
      .single();

    if (boardError || !board) {
      return { error: boardError?.message ?? "Board could not be created." };
    }

    for (let i = 0; i < template.columns.length; i++) {
      const col = template.columns[i];
      const { data: column, error: colError } = await supabase
        .from("columns")
        .insert({
          board_id: board.id,
          title: col.title,
          color: col.color,
          position: (i + 1) * 1000,
        })
        .select("id")
        .single();

      if (colError || !column) {
        return { error: colError?.message ?? "Column could not be created." };
      }

      for (let j = 0; j < col.cards.length; j++) {
        const card = col.cards[j];
        const { error: cardError } = await supabase.from("cards").insert({
          column_id: column.id,
          title: card.title,
          description: card.description ?? "",
          position: (j + 1) * 1000,
        });
        if (cardError) {
          return { error: cardError.message };
        }
      }
    }

    return { boardId: board.id, position: board.position as number };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Board could not be created.";
    return { error: message };
  }
}
