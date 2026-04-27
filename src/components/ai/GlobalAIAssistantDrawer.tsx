"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AIChatSidebar from "@/components/ai/AIChatSidebar";

const STORAGE_KEY = "taskflow-ai-drawer-open";

function getBoardIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/boards\/([^/?#]+)/);
  return match?.[1] ?? null;
}

export function GlobalAIAssistantDrawer() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const boardId = useMemo(() => getBoardIdFromPath(pathname || ""), [pathname]);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    setIsOpen(saved === "1");
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, isOpen ? "1" : "0");
    }
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? "AI asistanı kapat" : "AI asistanı aç"}
        className="fixed bottom-4 right-3 z-[90] inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text)] shadow-lg transition hover:bg-[var(--app-column)] sm:bottom-5 sm:right-5"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
          <path d="M12 3C6.48 3 2 6.94 2 11.8c0 2.67 1.37 5.06 3.53 6.65L4.5 22l3.82-2.07c1.14.32 2.37.49 3.68.49 5.52 0 10-3.94 10-8.8S17.52 3 12 3zm-4 7h8v2H8v-2zm0 4h5v2H8v-2z" />
        </svg>
      </button>

      <div
        className={`fixed bottom-20 left-2 right-2 z-[95] h-[min(70vh,560px)] origin-bottom transition-all duration-200 ease-out sm:bottom-20 sm:left-auto sm:right-5 sm:h-[560px] sm:w-[380px] sm:max-h-[75vh] sm:max-w-[95vw] sm:origin-bottom-right ${
          isOpen
            ? "pointer-events-auto scale-100 opacity-100"
            : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        <AIChatSidebar
          boardId={boardId ?? undefined}
          onBoardUpdate={() => router.refresh()}
          onClose={() => setIsOpen(false)}
        />
      </div>
    </>
  );
}
