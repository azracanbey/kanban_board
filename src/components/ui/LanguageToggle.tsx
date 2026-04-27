"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/providers";

export function LanguageToggle() {
  const { locale, setLocale, t, mounted } = useI18n();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (mounted) {
      setHydrated(true);
    }
  }, [mounted]);

  if (!mounted || !hydrated) {
    return (
      <div
        className="h-9 w-[110px] animate-pulse rounded-full bg-[var(--app-column)]"
        aria-hidden
      />
    );
  }

  return (
    <div
      className="inline-flex rounded-full border border-[var(--app-border)] bg-[var(--app-card)] p-0.5 text-xs shadow-sm"
      role="group"
      aria-label={t("common.ariaLanguage")}
    >
      {(["tr", "en"] as const).map((code) => {
        const active = locale === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code as Locale)}
            className={`rounded-full px-2.5 py-1.5 font-semibold uppercase transition ${
              active
                ? "bg-[#CEFFC1] text-[#1A1A2E] ring-1 ring-[#6bc96b] dark:bg-[#2A3A28] dark:text-[#F1F3F9] dark:ring-[#3d5240]"
                : "text-[var(--app-text-muted)] hover:bg-[var(--app-column)]"
            }`}
          >
            {code === "tr" ? t("common.langTr") : t("common.langEn")}
          </button>
        );
      })}
    </div>
  );
}
