"use client";

import { defaultAnimateLayoutChanges, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { memo } from "react";
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
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: card.id,
      data: {
        type: "card",
        card,
      },
      animateLayoutChanges: defaultAnimateLayoutChanges,
    });

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
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group relative w-full min-h-[80px] touch-none border border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text)] shadow-sm transition hover:shadow-md dark:shadow-[0_2px_8px_rgba(0,0,0,0.35)] ${topAccent} ${isFresh ? "taskflow-card-new" : ""}`.trim()}
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
      <div className="pointer-events-none absolute inset-0 flex items-end justify-center px-2 pb-2 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100">
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
            {isMagicLoading ? "AI..." : "AI Magic"}
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
    </article>
  );
}

export const Card = memo(CardInner);
