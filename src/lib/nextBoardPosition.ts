import type { SupabaseClient } from "@supabase/supabase-js";

/** Kullanıcının son board'undan sonra yeni position (liste: position desc). */
export async function getNextBoardPositionForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("boards")
    .select("position")
    .eq("user_id", userId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const max = typeof data?.position === "number" ? data.position : 0;
  return max > 0 ? max + 1000 : 1000;
}
