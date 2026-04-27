"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useI18n } from "@/providers";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

type ProfileFormProps = {
  userId: string;
  email: string;
  initialProfile: Pick<Profile, "display_name" | "title">;
};

export function ProfileForm({ userId, email, initialProfile }: ProfileFormProps) {
  const { t } = useI18n();
  const router = useRouter();
  const supabase = createClient();
  const [displayName, setDisplayName] = useState(initialProfile.display_name);
  const [title, setTitle] = useState(initialProfile.title);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setSuccess(false);
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          title: title.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) {
        setFormError(t("profile.errorSave"));
        return;
      }

      setSuccess(true);
      router.refresh();
    } catch {
      setFormError(t("profile.errorSave"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="surface-panel mx-auto w-full max-w-lg space-y-4 p-6"
    >
      <div>
        <h1 className="text-xl font-bold text-[var(--app-text)]">{t("profile.heading")}</h1>
        <p className="mt-1 text-sm text-[var(--app-text-muted)]">{t("profile.subtitle")}</p>
      </div>

      <Input
        id="profile-display-name"
        label={t("profile.displayName")}
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        autoComplete="name"
      />

      <Input
        id="profile-title"
        label={t("profile.title")}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t("profile.titlePlaceholder")}
        autoComplete="organization-title"
      />

      <div>
        <label
          className="flex w-full flex-col gap-1.5 text-sm font-medium text-[var(--app-text)]"
          htmlFor="profile-email"
        >
          {t("common.email")}
        </label>
        <input
          id="profile-email"
          type="email"
          readOnly
          value={email}
          className="app-field app-field-input cursor-not-allowed opacity-90"
        />
      </div>

      {formError ? (
        <p className="rounded-md border border-red-200 bg-red-50/90 p-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {formError}
        </p>
      ) : null}

      {success ? (
        <p
          className="rounded-md border border-emerald-200 bg-emerald-50/90 p-2 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200"
          role="status"
        >
          {t("profile.saveSuccess")}
        </p>
      ) : null}

      <div className="pt-1">
        <Button type="submit" isLoading={isSaving} className="w-full sm:w-auto">
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}
