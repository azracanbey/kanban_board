"use client";

import Link from "next/link";
import {
  DndContext,
  MeasuringStrategy,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Column } from "@/components/board/Column";
import { DragOverlay } from "@/components/board/DragOverlay";
import {
  formatBoardCreatedAt,
  getOverColumnId,
  getSortableColumnId,
  groupCardsByColumn,
} from "@/components/board/boardLogic";
import { useBoardMutations } from "@/components/board/useBoardMutations";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/providers";
import { createClient } from "@/lib/supabase/client";
import type { Board, Card, Column as ColumnType } from "@/lib/types";
import { getFractionalPosition } from "@/lib/utils/fractionalIndex";

type BoardViewProps = {
  board: Board;
  columns: ColumnType[];
  cards: Card[];
  userDisplayName: string;
};

type PendingDeleteTarget =
  | { type: "column"; id: string }
  | { type: "card"; id: string };

type BoardColumnsListProps = {
  columnsState: ColumnType[];
  cardsByColumn: Record<string, Card[]>;
  deletingCardId: string | null;
  splittingCardId: string | null;
  freshCardIds: string[];
  deletingColumnId: string | null;
  onAddCard: (columnId: string, title: string) => Promise<void>;
  onDeleteCard: (cardId: string) => void;
  onAIMagicCard: (card: Card) => Promise<void>;
  onDeleteColumn: (columnId: string) => void;
  onEditCard: (card: Card) => void;
  onRenameColumn: (columnId: string, title: string) => Promise<void>;
};

function BoardColumnsListInner({
  columnsState,
  cardsByColumn,
  deletingCardId,
  splittingCardId,
  freshCardIds,
  deletingColumnId,
  onAddCard,
  onDeleteCard,
  onAIMagicCard,
  onDeleteColumn,
  onEditCard,
  onRenameColumn,
}: BoardColumnsListProps) {
  return (
    <div className="flex min-h-0 flex-col items-stretch gap-2 pr-1 md:flex-row md:items-start md:gap-0 md:divide-x md:divide-[var(--app-border)]">
      {columnsState.map((column, index) => (
        <div key={column.id} className="shrink-0 md:pl-2 md:first:pl-1">
          <Column
            column={column}
            columnIndex={index}
            cards={cardsByColumn[column.id] ?? []}
            deletingCardId={deletingCardId}
            splittingCardId={splittingCardId}
            freshCardIds={freshCardIds}
            isDeleting={deletingColumnId === column.id}
            onAddCard={onAddCard}
            onDeleteCard={onDeleteCard}
            onAIMagicCard={onAIMagicCard}
            onDeleteColumn={onDeleteColumn}
            onEditCard={onEditCard}
            onRenameColumn={onRenameColumn}
          />
        </div>
      ))}
    </div>
  );
}

const BoardColumnsList = memo(BoardColumnsListInner);

export function BoardView({ board, cards, columns, userDisplayName }: BoardViewProps) {
  const { t, locale } = useI18n();
  const supabase = useMemo(() => createClient(), []);
  const [columnsState, setColumnsState] = useState<ColumnType[]>(columns);
  const [cardsState, setCardsState] = useState<Card[]>(cards);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [dragError, setDragError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDeleteTarget | null>(
    null,
  );
  const [isMdUp, setIsMdUp] = useState(false);

  const {
    editingCard,
    editTitle,
    editDescription,
    editError,
    titleError,
    isSavingCard,
    newColumnTitle,
    newColumnError,
    columnActionError,
    isAddingColumn,
    deletingColumnId,
    deletingCardId,
    splittingCardId,
    freshCardIds,
    setEditTitle,
    setEditDescription,
    setNewColumnTitle,
    setColumnActionError,
    openEditModal,
    closeEditModal,
    handleSaveCardDetails,
    handleAddColumn,
    handleRenameColumn,
    performDeleteColumn,
    handleAddCard,
    performDeleteCard,
    splitCardIntoSubtasks,
  } = useBoardMutations({
    boardId: board.id,
    locale,
    cardsState,
    setCardsState,
    columnsState,
    setColumnsState,
    t,
    onDeleteSettled: () => setPendingDelete(null),
  });

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 550,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsMdUp(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const handler = async (event: Event) => {
      const custom = event as CustomEvent<{ boardId?: string }>;
      if (custom.detail?.boardId !== board.id) {
        return;
      }

      try {
        const { data: nextColumns, error: columnsError } = await supabase
          .from("columns")
          .select("id, board_id, title, position, created_at, color")
          .eq("board_id", board.id)
          .order("position", { ascending: true });

        if (columnsError) {
          setColumnActionError(t("error.loadBoard"));
          return;
        }

        const safeColumns = (nextColumns ?? []) as ColumnType[];
        const columnIds = safeColumns.map((c) => c.id);

        let safeCards: Card[] = [];
        if (columnIds.length > 0) {
          const { data: nextCards, error: cardsError } = await supabase
            .from("cards")
            .select("id, column_id, title, description, position, created_at, urgency_score, ai_magic_applied")
            .in("column_id", columnIds)
            .order("position", { ascending: true });

          if (cardsError) {
            setColumnActionError(t("error.loadBoard"));
            return;
          }

          safeCards = (nextCards ?? []) as Card[];
        }

        setColumnsState(safeColumns);
        setCardsState(safeCards);
        setDragError(null);
        setColumnActionError(null);
      } catch {
        setColumnActionError(t("error.loadBoard"));
      }
    };

    window.addEventListener("taskflow:board-mutated", handler as EventListener);
    return () =>
      window.removeEventListener("taskflow:board-mutated", handler as EventListener);
  }, [board.id, supabase, t]);

  const cardsByColumn = useMemo(
    () => groupCardsByColumn(columnsState, cardsState),
    [cardsState, columnsState],
  );

  const cardsById = useMemo(
    () =>
      cardsState.reduce<Record<string, Card>>((acc, card) => {
        acc[card.id] = card;
        return acc;
      }, {}),
    [cardsState],
  );
  const columnsById = useMemo(
    () =>
      columnsState.reduce<Record<string, ColumnType>>((acc, column) => {
        acc[column.id] = column;
        return acc;
      }, {}),
    [columnsState],
  );

  const activeCard =
    activeCardId === null ? null : cardsById[activeCardId] ?? null;
  const activeColumn =
    activeColumnId === null ? null : columnsById[activeColumnId] ?? null;
  

  const handleDragStart = (event: DragStartEvent) => {
    setDragError(null);
    setColumnActionError(null);
    const activeType = event.active.data.current?.type;
    const activeId = String(event.active.id);

    if (activeType === "column") {
      setActiveColumnId(activeId.replace("column-sort-", ""));
      return;
    }

    if (activeType === "card") {
      setActiveCardId(activeId);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    const activeType = active.data.current?.type;

    if (!over || activeType !== "card") {
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId === overId) {
      return;
    }

    const activeCardItem = cardsState.find((card) => card.id === activeId);
    if (!activeCardItem) {
      return;
    }

    const overColumnId = getOverColumnId(overId, cardsById);
    if (!overColumnId || overColumnId === activeCardItem.column_id) {
      return;
    }

    setCardsState((previous) =>
      previous.map((card) =>
        card.id === activeId ? { ...card, column_id: overColumnId } : card,
      ),
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeType = active.data.current?.type;
    setActiveCardId(null);
    setActiveColumnId(null);

    if (!over) {
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeType === "column") {
      const activeColumnIdFromDnd = getSortableColumnId(activeId, cardsById);
      const overColumnIdFromDnd = getSortableColumnId(overId, cardsById);

      if (!activeColumnIdFromDnd || !overColumnIdFromDnd) {
        return;
      }

      const oldIndex = columnsState.findIndex(
        (column) => column.id === activeColumnIdFromDnd,
      );
      const newIndex = columnsState.findIndex(
        (column) => column.id === overColumnIdFromDnd,
      );

      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
        return;
      }

      const previousColumns = columnsState;
      const reorderedColumns = arrayMove(columnsState, oldIndex, newIndex);
      const movedColumn = reorderedColumns[newIndex];
      const prevPosition = reorderedColumns[newIndex - 1]?.position;
      const nextPosition = reorderedColumns[newIndex + 1]?.position;
      const newPosition = getFractionalPosition(prevPosition, nextPosition);
      const optimisticColumns = reorderedColumns.map((column, index) =>
        index === newIndex ? { ...column, position: newPosition } : column,
      );

      setColumnsState(optimisticColumns);

      void (async () => {
        try {
          const { error: rpcError } = await supabase.rpc("move_column_tx", {
            p_column_id: movedColumn.id,
            p_prev_position: prevPosition ?? null,
            p_next_position: nextPosition ?? null,
          });

          if (rpcError) {
            const { error: fallbackError } = await supabase
              .from("columns")
              .update({ position: newPosition })
              .eq("id", movedColumn.id);
            if (fallbackError) {
              throw fallbackError;
            }
          }
        } catch {
          setColumnsState(previousColumns);
          setDragError(t("board.errorDragColumn"));
        }
      })();

      return;
    }

    const activeCardItem = cardsState.find((card) => card.id === activeId);
    if (!activeCardItem) {
      return;
    }

    const overColumnId = getOverColumnId(overId, cardsById);
    if (!overColumnId) {
      return;
    }

    const previousCards = cardsState;
    const cardsWithUpdatedColumn = cardsState.map((card) =>
      card.id === activeId ? { ...card, column_id: overColumnId } : card,
    );
    const targetColumnCards = cardsWithUpdatedColumn.filter(
      (card) => card.column_id === overColumnId,
    );
    const oldIndex = targetColumnCards.findIndex((card) => card.id === activeId);
    const overIndex = overId.startsWith("column-drop-")
      ? targetColumnCards.length - 1
      : targetColumnCards.findIndex((card) => card.id === overId);
    const reorderedTargetCards =
      oldIndex !== -1 && overIndex !== -1 && oldIndex !== overIndex
        ? arrayMove(targetColumnCards, oldIndex, overIndex)
        : targetColumnCards;
    const movedIndex = reorderedTargetCards.findIndex((card) => card.id === activeId);
    if (movedIndex === -1) {
      return;
    }

    const previousPosition = reorderedTargetCards[movedIndex - 1]?.position;
    const nextPosition = reorderedTargetCards[movedIndex + 1]?.position;
    const newPosition = getFractionalPosition(previousPosition, nextPosition);
    const targetCardsWithPosition = reorderedTargetCards.map((card, index) =>
      index === movedIndex ? { ...card, position: newPosition } : card,
    );
    const targetIds = new Set(targetCardsWithPosition.map((card) => card.id));
    const nonTargetCards = cardsWithUpdatedColumn.filter(
      (card) => !targetIds.has(card.id),
    );
    const optimisticCards = [...nonTargetCards, ...targetCardsWithPosition];
    const movedCard = targetCardsWithPosition[movedIndex];

    setCardsState(optimisticCards);

    void (async () => {
      try {
        const { error: rpcError } = await supabase.rpc("move_card_tx", {
          p_card_id: movedCard.id,
          p_target_column_id: movedCard.column_id,
          p_prev_position: previousPosition ?? null,
          p_next_position: nextPosition ?? null,
        });

        if (rpcError) {
          const { error: fallbackError } = await supabase
            .from("cards")
            .update({
              column_id: movedCard.column_id,
              position: movedCard.position,
            })
            .eq("id", movedCard.id);
          if (fallbackError) {
            throw fallbackError;
          }
        }
      } catch {
        setCardsState(previousCards);
        setDragError(t("board.errorDragCard"));
      }
    })();
  };

  const activeColumnIndex =
    activeColumn === null
      ? 0
      : Math.max(0, columnsState.findIndex((c) => c.id === activeColumn.id));

  const handleDeleteCardRequest = useCallback((cardId: string) => {
    setPendingDelete({ type: "card", id: cardId });
  }, []);

  const handleDeleteColumnRequest = useCallback((columnId: string) => {
    setPendingDelete({ type: "column", id: columnId });
  }, []);

  const handleAIMagicCardRequest = useCallback(
    async (card: Card) => {
      await splitCardIntoSubtasks(card);
    },
    [splitCardIntoSubtasks],
  );

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 border-b border-[var(--app-border)] bg-[var(--app-card)] px-2 pb-3 pt-1 sm:flex-row sm:items-end sm:justify-between sm:px-0">
        <div className="min-w-0 flex-1 space-y-2">
          <nav aria-label="Breadcrumb" className="text-xs text-[var(--app-text-muted)]">
            <ol className="flex flex-wrap items-center gap-1">
              <li>
                <Link
                  href="/boards"
                  className="rounded-md font-medium text-[#2f5ea3] underline-offset-2 hover:underline dark:text-[#9fc3ff]"
                >
                  {t("nav.boards")}
                </Link>
              </li>
              <li aria-hidden className="select-none">
                /
              </li>
              <li className="truncate font-medium text-[var(--app-text)]">{board.title}</li>
            </ol>
          </nav>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link
              href="/boards"
              className="inline-flex h-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-column)] px-2 text-sm font-medium text-[var(--app-text)] transition-transform hover:-translate-x-0.5 hover:bg-[var(--app-card)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C1C7FF]"
              aria-label={t("board.backToBoards")}
            >
              <span className="text-lg leading-none" aria-hidden>
                ←
              </span>
              <span className="ml-1 hidden sm:inline">{t("board.backToBoards")}</span>
            </Link>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-[var(--app-text)]">
                {board.title}
              </h1>
              <p className="text-sm text-[var(--app-text-muted)]">{userDisplayName}</p>
            </div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] font-medium text-[var(--app-text-muted)]">
            {t("board.metaDateLabel")}
          </p>
          <p className="mt-0.5 font-semibold text-[var(--app-text)]">
            {formatBoardCreatedAt(board.created_at, locale)}
          </p>
        </div>
      </div>

      <div className="surface-panel p-3">
        <p className="mb-2 text-xs font-medium text-[var(--app-text-muted)]">
          {t("board.addColumn")}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <Input
              id="new-column-title"
              label={t("common.newColumn")}
              value={newColumnTitle}
              onChange={(event) => setNewColumnTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                event.stopPropagation();
                void handleAddColumn();
              }}
              placeholder={t("common.placeholderNewColumn")}
              error={newColumnError}
            />
          </div>
          <Button
            type="button"
            className="sm:shrink-0"
            onClick={handleAddColumn}
            isLoading={isAddingColumn}
          >
            {t("board.addColumn")}
          </Button>
        </div>
        {dragError ? (
          <p className="mt-2 rounded-md bg-red-50 p-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
            {dragError}
          </p>
        ) : null}
        {columnActionError ? (
          <p className="mt-2 rounded-md bg-red-50 p-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
            {columnActionError}
          </p>
        ) : null}
      </div>

      {columnsState.length === 0 ? (
        <div className="flex min-h-[280px] items-center justify-center overflow-hidden rounded border border-[var(--app-border)] bg-[var(--app-column)] p-4 text-sm text-[var(--app-text-muted)]">
          {t("board.noColumns")}
        </div>
      ) : (
        <DndContext
          id={`board-dnd-${board.id}`}
          sensors={sensors}
          collisionDetection={closestCorners}
          measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="overflow-hidden rounded border border-[var(--app-border)] bg-[var(--app-column)] shadow-inner">
            <div
              className="min-w-0 overflow-x-visible p-2 md:overflow-x-auto"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <SortableContext
                items={columnsState.map((column) => `column-sort-${column.id}`)}
                strategy={isMdUp ? horizontalListSortingStrategy : verticalListSortingStrategy}
              >
                <BoardColumnsList
                  columnsState={columnsState}
                  cardsByColumn={cardsByColumn}
                  deletingCardId={deletingCardId}
                  splittingCardId={splittingCardId}
                  freshCardIds={freshCardIds}
                  deletingColumnId={deletingColumnId}
                  onAddCard={handleAddCard}
                  onDeleteCard={handleDeleteCardRequest}
                  onAIMagicCard={handleAIMagicCardRequest}
                  onDeleteColumn={handleDeleteColumnRequest}
                  onEditCard={openEditModal}
                  onRenameColumn={handleRenameColumn}
                />
              </SortableContext>
            </div>
          </div>
          <DragOverlay
            activeCard={activeCard}
            activeColumn={activeColumn}
            activeColumnIndex={activeColumnIndex}
          />
        </DndContext>
      )}

      <Modal
        isOpen={Boolean(editingCard)}
        onClose={closeEditModal}
        title={t("board.cardModal")}
      >
        <div className="space-y-4">
          <Input
            id="edit-card-title"
            label={t("board.cardTitleLabel")}
            value={editTitle}
            onChange={(event) => setEditTitle(event.target.value)}
            error={titleError}
            required
          />
          <label className="flex w-full flex-col gap-1.5 text-sm font-medium text-[var(--app-text)]">
            <span>{t("board.cardDescLabel")}</span>
            <textarea
              value={editDescription}
              onChange={(event) => setEditDescription(event.target.value)}
              rows={5}
              className="app-field app-field-textarea"
              placeholder={t("board.cardDescPlaceholder")}
            />
          </label>
          {editError ? (
            <p className="rounded-md bg-red-50 p-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
              {editError}
            </p>
          ) : null}
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => closeEditModal()}
              disabled={isSavingCard}
            >
              {t("common.cancel")}
            </Button>
            <Button type="button" onClick={handleSaveCardDetails} isLoading={isSavingCard}>
              {t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title={t("common.confirm")}
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--app-text)]">
            {t("boards.deleteConfirm")}
          </p>
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPendingDelete(null)}
              disabled={deletingCardId !== null || deletingColumnId !== null}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                if (!pendingDelete) {
                  return;
                }

                if (pendingDelete.type === "card") {
                  void performDeleteCard(pendingDelete.id);
                  return;
                }

                void performDeleteColumn(pendingDelete.id);
              }}
              isLoading={deletingCardId !== null || deletingColumnId !== null}
            >
              {t("common.yesDelete")}
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
