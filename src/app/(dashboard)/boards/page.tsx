import { BoardsPageClient } from "@/components/board/BoardsPageClient";
import { tr } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/server";
import type { Board } from "@/lib/types";

export default async function BoardsPage() {
  const supabase = await createClient();
  let boards: Board[] = [];
  let errorMessage: string | null = null;
  let userId = "";

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      errorMessage = userError?.message ?? tr["boards.errorNoUser"];
    } else {
      userId = user.id;

      const { data, error } = await supabase
        .from("boards")
        .select("id, title, created_at, user_id, position")
        .eq("user_id", user.id)
        .order("position", { ascending: false });

      if (error) {
        errorMessage = error.message;
      } else {
        boards = (data ?? []) as Board[];
      }
    }
  } catch {
    errorMessage = tr["boards.errorLoad"];
  }

  return (
    <BoardsPageClient
      userId={userId}
      initialBoards={boards}
      initialError={errorMessage}
    />
  );
}
