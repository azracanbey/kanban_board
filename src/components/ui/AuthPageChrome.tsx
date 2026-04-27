"use client";

import type { ReactNode } from "react";
import { LanguageToggle } from "@/components/ui/LanguageToggle";

export function AuthPageChrome({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--app-page)] text-[var(--app-text)]">
      <div className="flex justify-end p-4">
        <LanguageToggle />
      </div>
      <div className="flex flex-1 items-center justify-center p-4 pb-12">
        {children}
      </div>
    </div>
  );
}
