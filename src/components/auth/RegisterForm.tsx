"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useI18n } from "@/providers";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RegisterForm() {
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [formError, setFormError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    let hasError = false;

    if (!emailRegex.test(email)) {
      setEmailError(t("auth.errorInvalidEmail"));
      hasError = true;
    } else {
      setEmailError("");
    }

    if (password.length < 6) {
      setPasswordError(t("auth.errorPasswordShort"));
      hasError = true;
    } else {
      setPasswordError("");
    }

    return !hasError;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    if (!validate()) {
      return;
    }

    const supabase = createClient();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setFormError(error.message);
        return;
      }

      router.push("/boards");
      router.refresh();
    } catch {
      setFormError(t("auth.errorUnexpected"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="surface-panel w-full max-w-md space-y-4 p-6 shadow-sm"
    >
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-[var(--app-text)]">
          {t("auth.registerTitle")}
        </h1>
        <p className="text-sm text-[var(--app-text-muted)]">
          {t("auth.registerSubtitle")}
        </p>
      </div>

      <Input
        id="email"
        label={t("common.email")}
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder={t("common.placeholderEmail")}
        error={emailError}
        required
      />

      <Input
        id="password"
        label={t("common.password")}
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder={t("common.placeholderPassword")}
        error={passwordError}
        required
      />

      {formError ? (
        <p className="rounded-md bg-red-50 p-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {formError}
        </p>
      ) : null}

      <Button type="submit" className="w-full" isLoading={isLoading}>
        {t("auth.registerCta")}
      </Button>

      <p className="text-sm text-[var(--app-text-muted)]">
        {t("auth.hasAccount")}{" "}
        <Link
          className="font-semibold text-[#3a3d5c] underline decoration-[#C1C7FF] decoration-2 underline-offset-2 dark:text-[#C1C7FF]"
          href="/login"
        >
          {t("auth.toLogin")}
        </Link>
      </p>
    </form>
  );
}
