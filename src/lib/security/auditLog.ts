import type { SupabaseClient } from "@supabase/supabase-js";

export async function insertAuditLog(
  supabase: SupabaseClient,
  params: { userId: string; action: string; detail: string; ip: string | null },
): Promise<void> {
  const { error } = await supabase.from("audit_logs").insert({
    user_id: params.userId,
    action: params.action.slice(0, 200),
    detail: params.detail.slice(0, 2000),
    ip: params.ip ? params.ip.slice(0, 128) : null,
  });
  if (error) {
    console.warn("audit_logs insert failed:", error.message);
  }
}
