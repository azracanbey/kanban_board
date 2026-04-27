import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/ui/DashboardHeader";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const nameForAvatar =
    !profileError && profileRow ? (profileRow.display_name?.trim() ?? "") : "";
  const avatarInitial = (nameForAvatar.length > 0
    ? nameForAvatar[0]!
    : (user.email?.[0] ?? "?")
  ).toUpperCase();

  const signOut = async () => {
    "use server";

    const serverClient = await createClient();

    try {
      await serverClient.auth.signOut();
    } catch {
      // Deliberately redirect even if sign out fails remotely.
    }

    redirect("/login");
  };

  return (
    <div className="min-h-screen">
      <DashboardHeader
        email={user.email ?? ""}
        displayName={nameForAvatar}
        signOut={signOut}
        avatarInitial={avatarInitial}
      />
      <main className="mx-auto w-full max-w-7xl p-4">{children}</main>
    </div>
  );
}
