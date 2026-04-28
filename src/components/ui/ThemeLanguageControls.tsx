"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/providers";

export function ThemeLanguageControls({ vertical = false }: { vertical?: boolean } = {}) {
  const { setTheme, theme, systemTheme, resolvedTheme } = useTheme();
  const { locale, setLocale, t, mounted: langMounted } = useI18n();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !langMounted) {
    return (
      <div
        className="h-9 w-[200px] animate-pulse rounded-full bg-[var(--app-column)]"
        aria-hidden
      />
    );
  }

  return (
    <div className={`flex text-[var(--app-text)] ${vertical ? "flex-col items-center gap-1.5" : "items-center justify-end gap-1.5 sm:gap-2"}`}>
      <div
        className={`inline-flex justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-card)] p-0.5 shadow-sm ${vertical ? "w-fit text-sm" : "w-full text-xs"}`}
        role="group"
        aria-label={t("common.ariaTheme")}
      >
        {(
          [
            ["light", "common.themeLight", "☀"],
            ["dark", "common.themeDark", "🌙"],
            ["system", "common.themeSystem", "🖥"],
          ] as const
        ).map(([value, labelKey, mobileIcon]) => {
          const active = theme === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className={`rounded-full font-medium transition ${vertical ? "px-4 py-1.5" : "px-2 py-1.5 sm:px-2.5"} ${
                active
                  ? "bg-[#C1C7FF] text-[#1A1A2E] ring-1 ring-[#a8b0e8] dark:bg-[#3A3F5C] dark:text-[#F1F3F9] dark:ring-[#4A5070]"
                  : "text-[var(--app-text-muted)] hover:bg-[var(--app-column)]"
              }`}
              aria-label={t(labelKey)}
              title={t(labelKey)}
            >
              {vertical ? (
                t(labelKey)
              ) : (
                <>
                  <span className="sm:hidden" aria-hidden>
                    {mobileIcon}
                  </span>
                  <span className="hidden sm:inline">{t(labelKey)}</span>
                </>
              )}
            </button>
          );
        })}
      </div>
      <div
        className={`inline-flex justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-card)] p-0.5 shadow-sm ${vertical ? "w-fit text-sm" : "w-full text-xs"}`}
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
              className={`rounded-full font-semibold uppercase transition ${vertical ? "px-4 py-1.5" : "px-2.5 py-1.5"} ${
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
      <span className="sr-only">
        {theme === "system"
          ? `${t("common.themeSystem")} (${(resolvedTheme ?? systemTheme) === "dark" ? t("common.themeDark") : t("common.themeLight")})`
          : theme === "dark"
            ? t("common.themeDark")
            : t("common.themeLight")}
      </span>
    </div>
  );
}
