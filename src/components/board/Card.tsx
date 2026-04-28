"use client";

import { defaultAnimateLayoutChanges, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { memo, useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { useI18n } from "@/providers";
import { getCardTopAccent } from "@/lib/kanbanPastel";
import { getUrgencyBand, urgencyBadgeClass } from "@/lib/urgencyScore";
import type { Card as CardType } from "@/lib/types";

type CardProps = {
  card: CardType;
  onEdit: (card: CardType) => void;
  onDelete: (cardId: string) => void;
  onAIMagic: (card: CardType) => Promise<void>;
  isDeleting: boolean;
  isMagicLoading: boolean;
  isFresh: boolean;
};

function CardInner({ card, isDeleting, isMagicLoading, isFresh, onDelete, onEdit, onAIMagic }: CardProps) {
  const { t } = useI18n();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  const longPressTimer = useRef<number | null>(null);
  const cardElRef = useRef<HTMLElement | null>(null);
  const lastTapAtRef = useRef<number>(0);

  const { attributes, isDragging, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: card.id,
      data: {
        type: "card",
        card,
      },
      animateLayoutChanges: defaultAnimateLayoutChanges,
    });

  const combinedRef = useCallback(
    (node: HTMLElement | null) => {
      setNodeRef(node);
      cardElRef.current = node;
    },
    [setNodeRef],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const mq = window.matchMedia("(pointer: coarse)");
    const sync = () => setIsCoarsePointer(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  useEffect(() => () => clearLongPress(), [clearLongPress]);

  useEffect(() => {
    if (!showMobileMenu) {
      return;
    }
    const close = (e: Event) => {
      const node = cardElRef.current;
      const target = e.target;
      if (!(target instanceof Node) || !node || node.contains(target)) {
        return;
      }
      setShowMobileMenu(false);
    };
    document.addEventListener("touchstart", close, true);
    document.addEventListener("mousedown", close, true);
    return () => {
      document.removeEventListener("touchstart", close, true);
      document.removeEventListener("mousedown", close, true);
    };
  }, [showMobileMenu]);

  const openMobileMenu = useCallback(() => {
    setShowMobileMenu(true);
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(12);
    }
  }, []);

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    if (!isCoarsePointer || event.pointerType !== "touch") {
      return;
    }
    clearLongPress();
    setIsPressing(true);
    longPressTimer.current = window.setTimeout(() => {
      longPressTimer.current = null;
      setIsPressing(false);
      openMobileMenu();
    }, 500);
  };

  const handlePointerUp = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "touch") {
      return;
    }
    clearLongPress();
    setIsPressing(false);

    // Mobilde alternatif: çift dokunuşla (double tap) menüyü aç.
    const now = Date.now();
    const lastTap = lastTapAtRef.current;
    lastTapAtRef.current = now;
    if (!showMobileMenu && now - lastTap < 280) {
      openMobileMenu();
    }
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const topAccent = getCardTopAccent(card.id);
  const urgency =
    typeof card.urgency_score === "number" && card.urgency_score >= 1 && card.urgency_score <= 10
      ? card.urgency_score
      : null;
  const band = urgency !== null ? getUrgencyBand(urgency) : null;
  const urgencyLabel =
    band === "high"
      ? t("board.urgencyHigh")
      : band === "medium"
        ? t("board.urgencyMedium")
        : band === "low"
          ? t("board.urgencyLow")
          : "";

  return (
    <article
      ref={combinedRef}
      style={style}
      {...attributes}
      {...listeners}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`group relative w-full min-h-[80px] touch-none border border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text)] shadow-sm transition hover:shadow-md dark:shadow-[0_2px_8px_rgba(0,0,0,0.35)] ${isPressing ? "ring-2 ring-[#C1C7FF]/55 scale-[0.99]" : ""} ${topAccent} ${isFresh ? "taskflow-card-new" : ""}`.trim()}
    >
      <div className="flex w-full flex-col gap-1.5 p-4 text-left">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="min-w-0 flex-1 break-words text-sm font-semibold leading-tight text-[var(--app-text)]">
            {card.title}
          </h3>
          {urgency !== null && band ? (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold leading-tight ${urgencyBadgeClass(band)}`}
            >
              {urgencyLabel} · {urgency}/10
            </span>
          ) : null}
        </div>
        {card.description ? (
          <p className="w-full break-words whitespace-pre-wrap text-[11px] font-normal leading-snug text-[var(--app-text)] opacity-85">
            {card.description}
          </p>
        ) : null}
      </div>
      {/* Desktop: hover ile aksiyon barı. Mobil ekranlarda responsive olarak gizli. */}
      {!isCoarsePointer ? (
        <div className="pointer-events-none absolute inset-0 hidden items-end justify-center px-2 pb-2 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100 md:flex">
          <div
            className="pointer-events-auto flex translate-y-0.5 gap-1 rounded border border-[var(--app-border)] bg-[var(--app-card)] px-0.5 py-0.5 shadow-sm"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="min-h-9 min-w-9 rounded px-1.5 py-0.5 text-[10px] font-medium text-[var(--app-text)] hover:bg-[var(--app-column)] sm:min-h-0 sm:min-w-0"
              onClick={(event) => {
                event.stopPropagation();
                onEdit(card);
              }}
            >
              {t("common.edit")}
            </button>
            <button
              type="button"
              className="min-h-9 min-w-9 rounded px-1.5 py-0.5 text-[10px] font-medium text-[#2f5ea3] hover:bg-[#e8f1ff] disabled:opacity-50 dark:text-[#9fc3ff] dark:hover:bg-[#1d2a3f] sm:min-h-0 sm:min-w-0"
              onClick={async (event) => {
                event.stopPropagation();
                await onAIMagic(card);
              }}
              disabled={isMagicLoading}
            >
              {isMagicLoading ? t("board.cardAiLoading") : t("board.cardMenuAiMagic")}
            </button>
            <button
              type="button"
              className="min-h-9 min-w-9 rounded px-1.5 py-0.5 text-[10px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/30 sm:min-h-0 sm:min-w-0"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(card.id);
              }}
              disabled={isDeleting}
            >
              {isDeleting ? t("common.deleting") : t("common.delete")}
            </button>
          </div>
        </div>
      ) : null}
      {isCoarsePointer && showMobileMenu ? (
        <div
          className="absolute right-0 top-0 z-50 flex min-w-[160px] flex-col gap-1 rounded-xl border border-[var(--app-border)] bg-[var(--app-card)] p-1 shadow-lg dark:border-[#3A3D52] dark:bg-[#1E2130]"
          onPointerDown={(event) => event.stopPropagation()}
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            className="min-h-11 rounded-lg px-3 py-2 text-left text-sm font-medium text-[var(--app-text)] hover:bg-[var(--app-column)]"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(card);
              setShowMobileMenu(false);
            }}
          >
            ✏️ {t("common.edit")}
          </button>
          <button
            type="button"
            role="menuitem"
            className="min-h-11 rounded-lg px-3 py-2 text-left text-sm font-medium text-[var(--app-text)] hover:bg-[var(--app-column)]"
            onClick={async (event) => {
              event.stopPropagation();
              setShowMobileMenu(false);
              await onAIMagic(card);
            }}
            disabled={isMagicLoading}
          >
            ✨ {isMagicLoading ? t("board.cardAiLoading") : t("board.cardMenuAiMagic")}
          </button>
          <button
            type="button"
            role="menuitem"
            className="min-h-11 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(card.id);
              setShowMobileMenu(false);
            }}
            disabled={isDeleting}
          >
            🗑 {isDeleting ? t("common.deleting") : t("common.delete")}
          </button>
        </div>
      ) : null}
    </article>
  );
}

export const Card = memo(CardInner);
