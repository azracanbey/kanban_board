import { BoardView } from "@/components/board/BoardView";
import { tr } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/server";
import type { Board, Card, Column } from "@/lib/types";

type BoardDetailPageProps = {
  params: Promise<{
    boardId: string;
  }>;
};

export default async function BoardDetailPage({ params }: BoardDetailPageProps) {
  const { boardId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let board: Board | null = null;
  let columns: Column[] = [];
  let cards: Card[] = [];
  let errorMessage: string | null = null;

  try {
    if (!user) {
      errorMessage = tr["boards.errorNoUser"];
      throw new Error("missing user");
    }

    const { data: boardData, error: boardError } = await supabase
      .from("boards")
      .select("id, title, created_at, user_id, position")
      .eq("id", boardId)
      .eq("user_id", user.id)
      .single();

    if (boardError) {
      errorMessage = boardError.message;
    } else {
      board = boardData as Board;

      const { data: columnData, error: columnError } = await supabase
        .from("columns")
        .select("id, board_id, title, position, created_at, color")
        .eq("board_id", boardId)
        .order("position", { ascending: true });

      if (columnError) {
        errorMessage = columnError.message;
      } else {
        columns = (columnData ?? []) as Column[];
      }

      if (!errorMessage && columns.length > 0) {
        const columnIds = columns.map((column) => column.id);
        const { data: cardData, error: cardError } = await supabase
          .from("cards")
          .select("id, column_id, title, description, position, created_at, urgency_score, ai_magic_applied")
          .in("column_id", columnIds)
          .order("position", { ascending: true });

        if (cardError) {
          errorMessage = cardError.message;
        } else {
          cards = (cardData ?? []) as Card[];
        }
      }
    }
  } catch {
    if (!errorMessage) {
      errorMessage = tr["error.loadBoard"];
    }
  }

  if (errorMessage) {
    return (
      <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">
        {errorMessage}
      </section>
    );
  }

  if (!board) {
    return (
      <section className="surface-panel p-4 text-sm text-[var(--app-text-muted)]">
        {tr["notFound.board"]}
      </section>
    );
  }

  if (!user) {
    return (
      <section className="surface-panel p-4 text-sm text-[var(--app-text-muted)]">
        {tr["boards.errorNoUser"]}
      </section>
    );
  }

  const { data: userProfile, error: profileQueryError } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const fromProfile =
    !profileQueryError && userProfile ? (userProfile.display_name?.trim() ?? "") : "";
  const userDisplayName =
    fromProfile !== "" ? fromProfile : (user.email?.split("@")[0] ?? "");

  return (
    <BoardView
      board={board}
      columns={columns}
      cards={cards}
      userDisplayName={userDisplayName}
    />
  );
}
