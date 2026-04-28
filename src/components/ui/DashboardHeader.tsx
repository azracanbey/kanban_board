"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ThemeLanguageControls } from "@/components/ui/ThemeLanguageControls";
import { useI18n } from "@/providers";
import taskflowLogo from "../../../logo.png";

type DashboardHeaderProps = {
  email: string;
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const close = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close, true);
    document.addEventListener("touchstart", close, true);
    return () => {
      document.removeEventListener("mousedown", close, true);
      document.removeEventListener("touchstart", close, true);
    };
  }, [mobileMenuOpen]);

  return (
    <header className="border-b border-[var(--app-border)] bg-[var(--app-card)] px-4 py-3 shadow-sm">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 sm:gap-3">
        {/* Sol: Logo + kullanıcı adı (md+) */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link
            href="/boards"
            className="inline-flex shrink-0 items-center justify-center rounded-md transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C1C7FF]"
            aria-label={t("nav.homeToBoards")}
          >
            <Image
              src={taskflowLogo}
              alt="TaskFlow"
              className="h-12 w-auto object-contain"
              priority
            />
          </Link>
          <p
            className="hidden min-w-0 truncate text-sm text-[var(--app-text)] md:block"
            title={signedInLabel !== email ? email : undefined}
          >
            {t("common.user")}: {signedInLabel}
          </p>
        </div>

        {/* Sağ: md+ tam kontroller */}
        <div className="hidden items-center gap-2 md:flex md:gap-3">
          <ThemeLanguageControls />
          <Link
            href="/profile"
            className="inline-flex h-11 min-h-[44px] w-11 min-w-[44px] shrink-0 items-center justify-center rounded-full text-sm font-bold text-[#2D2D5E] transition hover:brightness-95"
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
              className="h-11 min-h-[44px]"
              aria-label={t("common.logout")}
            >
              {t("common.logout")}
            </Button>
          </form>
        </div>

        {/* Sağ: mobil — üç nokta menü */}
        <div className="relative flex items-center gap-2 md:hidden" ref={menuRef}>
          <Link
            href="/profile"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-[#2D2D5E] transition hover:brightness-95"
            style={{ backgroundColor: "#C1C7FF" }}
            title={t("common.ariaProfile")}
            aria-label={t("common.ariaProfile")}
          >
            {avatarInitial}
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-column)] text-[var(--app-text)] transition hover:bg-[var(--app-card)]"
            aria-label="Menu"
            aria-expanded={mobileMenuOpen}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
              <circle cx="10" cy="4" r="1.5" />
              <circle cx="10" cy="10" r="1.5" />
              <circle cx="10" cy="16" r="1.5" />
            </svg>
          </button>

          {mobileMenuOpen ? (
            <div className="absolute right-0 top-full z-50 mt-2 w-[220px] rounded-xl border border-[var(--app-border)] bg-[var(--app-card)] p-2.5 shadow-lg">
              <p
                className="mb-2 truncate text-center text-sm text-[var(--app-text-muted)]"
                title={signedInLabel !== email ? email : undefined}
              >
                {signedInLabel}
              </p>
              <div className="mb-2.5">
                <ThemeLanguageControls vertical />
              </div>
              <form action={signOut} className="flex justify-center">
                <Button
                  type="submit"
                  variant="secondary"
                  className="h-10 w-[188px] justify-center text-center text-sm font-semibold"
                  aria-label={t("common.logout")}
                >
                  {t("common.logout")}
                </Button>
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
