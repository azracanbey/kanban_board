import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("display_name, title")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return (
      <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
        {profileError.message}
      </section>
    );
  }

  if (!profile) {
    const { data: inserted, error: insertError } = await supabase
      .from("profiles")
      .insert({ id: user.id, display_name: "", title: "" })
      .select("display_name, title")
      .single();

    if (insertError) {
      return (
        <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {insertError.message}
        </section>
      );
    }
    profile = inserted as Pick<Profile, "display_name" | "title">;
  }

  return (
    <ProfileForm
      userId={user.id}
      email={user.email ?? ""}
      initialProfile={profile}
    />
  );
}

export const metadata = {
  title: "Profil — TaskFlow",
};
