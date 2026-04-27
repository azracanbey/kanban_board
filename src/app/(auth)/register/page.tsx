import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { AuthPageChrome } from "@/components/ui/AuthPageChrome";
import { createClient } from "@/lib/supabase/server";

export default async function RegisterPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/boards");
  }

  return (
    <AuthPageChrome>
      <RegisterForm />
    </AuthPageChrome>
  );
}
