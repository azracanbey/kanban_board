import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { AuthPageChrome } from "@/components/ui/AuthPageChrome";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/boards");
  }

  return (
    <AuthPageChrome>
      <LoginForm />
    </AuthPageChrome>
  );
}
