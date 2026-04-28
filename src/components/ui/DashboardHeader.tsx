"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ThemeLanguageControls } from "@/components/ui/ThemeLanguageControls";
import { useI18n } from "@/providers";

type DashboardHeaderProps = {
  email: string;
  /** Profilde doluysa üst çubukta bu gösterilir; yoksa `email`. */
  displayName?: string;
  signOut: () => void;
  avatarInitial: string;
};

export function DashboardHeader({
  email,
  displayName = "",
  signOut,
  avatarInitial,
}: DashboardHeaderProps) {
  const { t } = useI18n();
  const signedInLabel = displayName.trim().length > 0 ? displayName.trim() : email;

  return (
    <header className="border-b border-[var(--app-border)] bg-[var(--app-card)] px-4 py-3 shadow-sm">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 sm:gap-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link
            href="/boards"
            className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-column)] px-2.5 text-sm font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-page)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C1C7FF] sm:gap-2 sm:px-3"
            aria-label={t("nav.homeToBoards")}
          >
            <span className="text-lg leading-none text-[#2f5ea3] dark:text-[#9fc3ff]" aria-hidden>
              ⌂
            </span>
            <span className="truncate">TaskFlow</span>
          </Link>
          <p
            className="hidden min-w-0 truncate text-sm text-[var(--app-text)] md:block"
            title={signedInLabel !== email ? email : undefined}
          >
            {t("common.user")}: {signedInLabel}
          </p>
        </div>
        <div className="flex min-w-0 items-center justify-end gap-1.5 sm:gap-2 md:gap-3">
          <ThemeLanguageControls />
          <div className="flex items-center justify-end gap-2 sm:shrink-0">
            <Link
              href="/profile"
              className="inline-flex h-11 min-h-[44px] w-11 min-w-[44px] flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-[#2D2D5E] transition hover:brightness-95"
              style={{ backgroundColor: "#C1C7FF" }}
              title={t("common.ariaProfile")}
              aria-label={t("common.ariaProfile")}
            >
              {avatarInitial}
            </Link>
            <form action={signOut} className="shrink-0">
              <Button
                type="submit"
                variant="secondary"
                className="h-11 min-h-[44px] min-w-[44px] px-3 sm:w-auto sm:min-w-0"
                aria-label={t("common.logout")}
                title={t("common.logout")}
              >
                <span className="sm:hidden" aria-hidden>
                  ↪
                </span>
                <span className="hidden sm:inline">{t("common.logout")}</span>
              </Button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}
