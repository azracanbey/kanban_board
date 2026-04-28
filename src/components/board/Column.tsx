"use client";

import { memo, useMemo, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  defaultAnimateLayoutChanges,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/board/Card";
import { useI18n } from "@/providers";
import { getColumnPastelHex } from "@/lib/kanbanPastel";
import type { Card as CardType, Column as ColumnType } from "@/lib/types";

type ColumnProps = {
  column: ColumnType;
  columnIndex: number;
  cards: CardType[];
  onEditCard: (card: CardType) => void;
  onDeleteCard: (cardId: string) => void;
  onAIMagicCard: (card: CardType) => Promise<void>;
  deletingCardId: string | null;
  splittingCardId: string | null;
  freshCardIds: string[];
  onDeleteColumn: (columnId: string) => void;
  isDeleting: boolean;
  onAddCard: (columnId: string, title: string) => Promise<void>;
  onRenameColumn: (columnId: string, title: string) => Promise<void>;
};

function ColumnInner({
  cards,
  column,
  columnIndex,
  deletingCardId,
  splittingCardId,
  freshCardIds,
  isDeleting,
  onAddCard,
  onDeleteCard,
  onAIMagicCard,
  onDeleteColumn,
  onEditCard,
  onRenameColumn,
}: ColumnProps) {
  const { t } = useI18n();
  const [newCardTitle, setNewCardTitle] = useState("");
  const [cardError, setCardError] = useState("");
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(() => column.title);
  const [titleEditError, setTitleEditError] = useState("");
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({
    id: `column-drop-${column.id}`,
    data: {
      type: "column-dropzone",
      columnId: column.id,
    },
  });
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef: setSortableNodeRef,
    transform,
    transition,
  } = useSortable({
    id: `column-sort-${column.id}`,
    data: {
      type: "column",
      column,
    },
    animateLayoutChanges: defaultAnimateLayoutChanges,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const setNodeRef = (node: HTMLElement | null) => {
    setDroppableNodeRef(node);
    setSortableNodeRef(node);
  };

  const sortedCards = useMemo(
    () =>
      cards
        .filter((c) => c.column_id === column.id)
        .sort((a, b) => a.position - b.position),
    [cards, column.id],
  );

  const handleAddCard = async () => {
    const trimmedTitle = newCardTitle.trim();

    if (trimmedTitle.length < 1) {
      setCardError(t("column.cardErrorShort"));
      return;
    }

    if (trimmedTitle.length > 120) {
      setCardError(t("column.cardErrorLong"));
      return;
    }

    setCardError("");
    setIsAddingCard(true);

    try {
      await onAddCard(column.id, trimmedTitle);
      setNewCardTitle("");
    } catch (error) {
      if (error instanceof Error) {
        setCardError(error.message);
      } else {
        setCardError(t("column.cardErrorAdd"));
      }
    } finally {
      setIsAddingCard(false);
    }
  };

  const validateTitle = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setTitleEditError(t("column.titleError"));
      return false;
    }
    if (trimmed.length > 80) {
      setTitleEditError(t("column.titleError"));
      return false;
    }
    setTitleEditError("");
    return true;
  };

  const handleSaveTitle = async () => {
    if (!validateTitle(titleDraft)) {
      return;
    }
    const trimmed = titleDraft.trim();
    if (trimmed === column.title) {
      setIsEditingTitle(false);
      return;
    }
    setIsSavingTitle(true);
    try {
      await onRenameColumn(column.id, trimmed);
      setIsEditingTitle(false);
    } catch {
      /* parent columnActionError */
    } finally {
      setIsSavingTitle(false);
    }
  };

  const handleCancelTitle = () => {
    setTitleDraft(column.title);
    setTitleEditError("");
    setIsEditingTitle(false);
  };

  const columnHeaderColor = getColumnPastelHex(columnIndex);
  const overRing = isOver
    ? "ring-2 ring-[#C1C7FF] ring-offset-1 ring-offset-[var(--app-page)] dark:ring-[#3A3D52] dark:ring-offset-[#0f1117]"
    : "";

  return (
    <section
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex w-[220px] max-w-[220px] shrink-0 flex-col overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm sm:w-[240px] sm:max-w-[240px] ${overRing} transition-shadow`}
    >
        {isEditingTitle ? (
          <div
            className="space-y-2 border-b border-[var(--app-border)] px-4 py-3 rounded-t-xl"
            onPointerDown={(event) => event.stopPropagation()}
            style={{ backgroundColor: columnHeaderColor }}
          >
            <label className="sr-only" htmlFor={`column-title-${column.id}`}>
              {t("column.srColumnTitle")}
            </label>
            <input
              id={`column-title-${column.id}`}
              type="text"
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value)}
              className={`app-field app-field-input ${titleEditError ? "border-red-500" : ""}`}
              disabled={isSavingTitle}
            />
            {titleEditError ? (
              <p className="text-left text-xs text-red-600 dark:text-red-400">
                {titleEditError}
              </p>
            ) : null}
            <div className="flex flex-wrap justify-end gap-1.5">
              <button
                type="button"
                className="rounded border border-[var(--app-border)] bg-[var(--app-card)] px-2 py-0.5 text-xs font-medium text-[#1A1A2E] hover:brightness-95"
                onClick={handleCancelTitle}
                disabled={isSavingTitle}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="rounded border border-[var(--app-border)] bg-[#C1C7FF] px-2 py-0.5 text-xs font-medium text-[#1A1A2E] hover:brightness-95 dark:bg-[#3A3F5C] dark:text-[#F1F3F9]"
                onClick={() => void handleSaveTitle()}
                disabled={isSavingTitle}
              >
                {isSavingTitle ? t("column.saving") : t("column.save")}
              </button>
            </div>
          </div>
        ) : (
          <div
            className="relative border-b border-[var(--app-border)] px-4 py-3 pr-20 text-center text-sm font-semibold leading-tight text-[#1A1A2E] rounded-t-xl"
            style={{ backgroundColor: columnHeaderColor }}
          >
            <span className="block w-full break-words">{column.title}</span>
            <div
              className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-0.5"
              onPointerDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="rounded px-1 py-0.5 text-[10px] font-medium text-[#1A1A2E]/80 hover:opacity-100"
                onClick={() => {
                  setTitleDraft(column.title);
                  setTitleEditError("");
                  setIsEditingTitle(true);
                }}
                disabled={isDeleting}
              >
                {t("common.edit")}
              </button>
              <button
                type="button"
                className="rounded px-1 py-0.5 text-[10px] font-medium text-[#1A1A2E]/80 hover:opacity-100"
                onClick={() => onDeleteColumn(column.id)}
                disabled={isDeleting}
              >
                {isDeleting ? "…" : t("common.delete")}
              </button>
            </div>
          </div>
        )}

      <div className="flex flex-1 flex-col gap-2 bg-[var(--app-card)] p-2">
        {sortedCards.length === 0 ? (
          <p className="py-2 text-center text-xs text-[var(--app-text-muted)]">
            {t("common.noCards")}
          </p>
        ) : (
          <SortableContext
            items={sortedCards.map((card) => card.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-2">
              {sortedCards.map((card) => (
                <Card
                  key={card.id}
                  card={card}
                  isDeleting={deletingCardId === card.id}
                  isMagicLoading={splittingCardId === card.id}
                  isFresh={freshCardIds.includes(card.id)}
                  onDelete={onDeleteCard}
                  onAIMagic={onAIMagicCard}
                  onEdit={onEditCard}
                />
              ))}
            </div>
          </SortableContext>
        )}

        <div className="mt-auto space-y-1.5 border-t border-[var(--app-border)] pt-2">
          <input
            type="text"
            value={newCardTitle}
            onChange={(event) => setNewCardTitle(event.target.value)}
            onPointerDown={(event) => event.stopPropagation()}
            placeholder={t("common.placeholderNewCard")}
            className="app-field app-field-input !text-sm"
          />
          {cardError ? (
            <p className="text-[10px] text-red-600 dark:text-red-400">{cardError}</p>
          ) : null}
          <button
            type="button"
            className="h-8 w-full rounded-md border border-[var(--app-border)] bg-[var(--app-card)] text-xs font-medium text-[var(--app-text)] hover:brightness-95"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              void handleAddCard();
            }}
            disabled={isAddingCard}
          >
            {isAddingCard ? t("common.adding") : t("common.addCard")}
          </button>
        </div>
      </div>
    </section>
  );
}

export const Column = memo(ColumnInner);
