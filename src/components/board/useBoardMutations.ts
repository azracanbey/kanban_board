"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { persistColumnUrgencyOrder } from "@/lib/persistColumnUrgencyOrder";
import { createClient } from "@/lib/supabase/client";
import type { Card, Column as ColumnType } from "@/lib/types";
import { getFractionalPosition } from "@/lib/utils/fractionalIndex";

type UseBoardMutationsParams = {
  boardId: string;
  locale: "tr" | "en";
  cardsState: Card[];
  setCardsState: Dispatch<SetStateAction<Card[]>>;
  columnsState: ColumnType[];
  setColumnsState: Dispatch<SetStateAction<ColumnType[]>>;
  t: (key: string) => string;
  onDeleteSettled?: () => void;
};

export function useBoardMutations({
  boardId,
  locale,
  cardsState,
  setCardsState,
  columnsState,
  setColumnsState,
  t,
  onDeleteSettled,
}: UseBoardMutationsParams) {
  const supabase = useMemo(() => createClient(), []);

  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState("");
  const [isSavingCard, setIsSavingCard] = useState(false);

  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [newColumnError, setNewColumnError] = useState("");
  const [columnActionError, setColumnActionError] = useState<string | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);

  const [deletingColumnId, setDeletingColumnId] = useState<string | null>(null);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);
  const [splittingCardId, setSplittingCardId] = useState<string | null>(null);
  const [pastingColumnId, setPastingColumnId] = useState<string | null>(null);
  const [freshCardIds, setFreshCardIds] = useState<string[]>([]);

  const editingCard =
    editingCardId === null ? null : cardsState.find((card) => card.id === editingCardId) ?? null;

  const openEditModal = (card: Card) => {
    setEditingCardId(card.id);
    setEditTitle(card.title);
    setEditDescription(card.description);
    setEditError(null);
    setTitleError("");
  };

  const closeEditModal = (force = false) => {
    if (isSavingCard && !force) {
      return;
    }
    setEditingCardId(null);
    setEditTitle("");
    setEditDescription("");
    setEditError(null);
    setTitleError("");
  };

  const validateCardForm = () => {
    const trimmedTitle = editTitle.trim();
    if (trimmedTitle.length < 3 || trimmedTitle.length > 120) {
      setTitleError(t("board.validationCardTitle"));
      return false;
    }
    setTitleError("");
    return true;
  };

  const handleSaveCardDetails = async () => {
    if (!editingCardId || !editingCard) {
      return;
    }

    setEditError(null);
    if (!validateCardForm()) {
      return;
    }

    const nextTitle = editTitle.trim();
    const nextDescription = editDescription.trim();
    const previousCards = cardsState;

    setIsSavingCard(true);
    setCardsState((previous) =>
      previous.map((card) =>
        card.id === editingCardId ? { ...card, title: nextTitle, description: nextDescription } : card,
      ),
    );

    try {
      const { error } = await supabase
        .from("cards")
        .update({ title: nextTitle, description: nextDescription })
        .eq("id", editingCardId);

      if (error) {
        throw error;
      }
      closeEditModal(true);
    } catch {
      setCardsState(previousCards);
      setEditError(t("board.errorCardUpdate"));
    } finally {
      setIsSavingCard(false);
    }
  };

  const validateColumnTitle = () => {
    const trimmedTitle = newColumnTitle.trim();
    if (trimmedTitle.length < 2 || trimmedTitle.length > 80) {
      setNewColumnError(t("board.newColumnError"));
      return false;
    }
    setNewColumnError("");
    return true;
  };

  const handleAddColumn = async () => {
    setColumnActionError(null);
    if (!validateColumnTitle()) {
      return;
    }

    const title = newColumnTitle.trim();
    const lastPosition = columnsState[columnsState.length - 1]?.position;
    const newPosition = getFractionalPosition(lastPosition, undefined);
    setIsAddingColumn(true);

    try {
      const { data, error } = await supabase
        .from("columns")
        .insert({ board_id: boardId, title, position: newPosition })
        .select("id, board_id, title, position, created_at")
        .single();

      if (error) {
        throw error;
      }
      if (data) {
        setColumnsState((previous) => [...previous, data as ColumnType]);
      }
      setNewColumnTitle("");
    } catch {
      setColumnActionError(t("board.errorColumnAdd"));
    } finally {
      setIsAddingColumn(false);
    }
  };

  const handleRenameColumn = async (columnId: string, title: string) => {
    const trimmed = title.trim();
    if (trimmed.length < 2 || trimmed.length > 80) {
      throw new Error(t("board.errorInvalidColumnTitle"));
    }

    setColumnActionError(null);
    const previousColumns = columnsState;
    setColumnsState((previous) =>
      previous.map((column) => (column.id === columnId ? { ...column, title: trimmed } : column)),
    );

    try {
      const { error } = await supabase.from("columns").update({ title: trimmed }).eq("id", columnId);
      if (error) {
        throw error;
      }
    } catch {
      setColumnsState(previousColumns);
      setColumnActionError(t("board.errorColumnRename"));
      throw new Error("rename failed");
    }
  };

  const performDeleteColumn = async (columnId: string) => {
    setColumnActionError(null);
    setDeletingColumnId(columnId);

    const previousColumns = columnsState;
    const previousCards = cardsState;
    setColumnsState((previous) => previous.filter((column) => column.id !== columnId));
    setCardsState((previous) => previous.filter((card) => card.column_id !== columnId));

    try {
      const { error } = await supabase.from("columns").delete().eq("id", columnId);
      if (error) {
        throw error;
      }
    } catch {
      setColumnsState(previousColumns);
      setCardsState(previousCards);
      setColumnActionError(t("board.errorColumnDelete"));
    } finally {
      setDeletingColumnId(null);
      onDeleteSettled?.();
    }
  };

  const handleAddCard = async (columnId: string, title: string) => {
    const columnCards = cardsState
      .filter((card) => card.column_id === columnId)
      .sort((a, b) => a.position - b.position);
    const lastPosition = columnCards[columnCards.length - 1]?.position;
    const newPosition = getFractionalPosition(lastPosition, undefined);

    const optimisticCard: Card = {
      id: `temp-${Date.now()}`,
      column_id: columnId,
      title,
      description: "",
      position: newPosition,
      created_at: new Date().toISOString(),
      ai_magic_applied: false,
    };

    setCardsState((previous) => [...previous, optimisticCard]);

    try {
      const { data, error } = await supabase
        .from("cards")
        .insert({
          column_id: columnId,
          title,
          description: "",
          position: newPosition,
        })
        .select("id, column_id, title, description, position, created_at, urgency_score, ai_magic_applied")
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setCardsState((previous) =>
          previous.map((card) => (card.id === optimisticCard.id ? (data as Card) : card)),
        );
        const refreshed = await persistColumnUrgencyOrder(supabase, columnId);
        if (refreshed) {
          setCardsState((previous) => {
            const others = previous.filter((c) => c.column_id !== columnId);
            return [...others, ...refreshed];
          });
        }
      }
    } catch {
      setCardsState((previous) => previous.filter((card) => card.id !== optimisticCard.id));
      throw new Error(t("board.errorCardAdd"));
    }
  };

  const performDeleteCard = async (cardId: string) => {
    setColumnActionError(null);
    setDeletingCardId(cardId);

    const previousCards = cardsState;
    setCardsState((previous) => previous.filter((card) => card.id !== cardId));

    try {
      const { error } = await supabase.from("cards").delete().eq("id", cardId);
      if (error) {
        throw error;
      }
    } catch {
      setCardsState(previousCards);
      setColumnActionError(t("board.errorCardDelete"));
    } finally {
      setDeletingCardId(null);
      onDeleteSettled?.();
    }
  };

  const pasteCardToColumn = async (sourceCard: Card, targetColumnId: string) => {
    setColumnActionError(null);
    setPastingColumnId(targetColumnId);

    const columnCards = cardsState
      .filter((card) => card.column_id === targetColumnId)
      .sort((a, b) => a.position - b.position);
    const lastPosition = columnCards[columnCards.length - 1]?.position;
    const newPosition = getFractionalPosition(lastPosition, undefined);
    const copiedAiMagicApplied = sourceCard.ai_magic_applied === true;

    const optimisticCard: Card = {
      id: `temp-copy-${Date.now()}`,
      column_id: targetColumnId,
      title: sourceCard.title,
      description: sourceCard.description,
      position: newPosition,
      created_at: new Date().toISOString(),
      urgency_score: sourceCard.urgency_score ?? null,
      ai_magic_applied: copiedAiMagicApplied,
    };

    setCardsState((previous) => [...previous, optimisticCard]);

    try {
      const { data, error } = await supabase
        .from("cards")
        .insert({
          column_id: targetColumnId,
          title: sourceCard.title,
          description: sourceCard.description,
          position: newPosition,
          urgency_score: sourceCard.urgency_score ?? null,
          ai_magic_applied: copiedAiMagicApplied,
        })
        .select("id, column_id, title, description, position, created_at, urgency_score, ai_magic_applied")
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        const pastedCard = data as Card;
        setCardsState((previous) =>
          previous.map((card) => (card.id === optimisticCard.id ? pastedCard : card)),
        );
        setFreshCardIds((previous) => [...previous, pastedCard.id]);
        window.setTimeout(() => {
          setFreshCardIds((previous) => previous.filter((id) => id !== pastedCard.id));
        }, 1200);
      }
    } catch {
      setCardsState((previous) => previous.filter((card) => card.id !== optimisticCard.id));
      setColumnActionError(t("board.errorCardPaste"));
      throw new Error(t("board.errorCardPaste"));
    } finally {
      setPastingColumnId(null);
    }
  };

  const splitCardIntoSubtasks = async (card: Card) => {
    if (card.ai_magic_applied) {
      setColumnActionError(
        locale === "tr"
          ? "AI Magic bu karta zaten uygulandı."
          : "AI Magic was already applied to this card.",
      );
      return;
    }

    const description = card.description?.trim() ?? "";
    if (description.length < 8) {
      setColumnActionError(
        locale === "tr"
          ? "AI parçalama için kart açıklaması daha detaylı olmalı."
          : "Card description should be more detailed for AI splitting.",
      );
      return;
    }

    setColumnActionError(null);
    setSplittingCardId(card.id);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boardId,
          locale,
          message: "",
          magicSplit: {
            cardId: card.id,
            columnId: card.column_id,
            cardTitle: card.title,
            description,
          },
        }),
      });

      let data: {
        action?: string | null;
        actionData?: {
          createdCards?: Card[];
          columnCards?: Card[];
          columnId?: string;
          createdCardIds?: string[];
        } | null;
        reply?: string;
        error?: string;
      };
      try {
        data = (await res.json()) as typeof data;
      } catch {
        data = {};
      }

      if (!res.ok) {
        throw new Error(
          data.error ??
            data.reply ??
            (locale === "tr"
              ? "AI servisinden geçerli yanıt alınamadı."
              : "Invalid response from AI service."),
        );
      }

      if (data.action === "create_subtasks" && data.actionData) {
        const ad = data.actionData;
        if (ad.columnCards && ad.columnCards.length > 0 && ad.columnId) {
          setCardsState((previous) => {
            const others = previous.filter((c) => c.column_id !== ad.columnId);
            return [...others, ...ad.columnCards!];
          });
          const addedIds = ad.createdCardIds ?? ad.createdCards?.map((c) => c.id) ?? [];
          if (addedIds.length > 0) {
            setFreshCardIds((previous) => [...previous, ...addedIds]);
            window.setTimeout(() => {
              setFreshCardIds((previous) => previous.filter((id) => !addedIds.includes(id)));
            }, 1200);
          }
        } else if (ad.createdCards && ad.createdCards.length > 0) {
          const newCards = ad.createdCards;
          setCardsState((previous) => [...previous, ...newCards]);
          const addedIds = newCards.map((next) => next.id);
          setFreshCardIds((previous) => [...previous, ...addedIds]);
          window.setTimeout(() => {
            setFreshCardIds((previous) => previous.filter((id) => !addedIds.includes(id)));
          }, 1000);
        } else {
          setColumnActionError(
            data.reply ??
              (locale === "tr"
                ? "AI alt görev oluşturamadı."
                : "AI could not create subtasks."),
          );
        }
      } else {
        setColumnActionError(
          data.reply ??
            (locale === "tr"
              ? "AI alt görev oluşturamadı."
              : "AI could not create subtasks."),
        );
      }
    } catch (error) {
      setColumnActionError(
        error instanceof Error
          ? error.message
          : locale === "tr"
            ? "AI alt görev oluşturulamadı. Lütfen tekrar dene."
            : "AI subtasks could not be created. Please try again.",
      );
    } finally {
      setSplittingCardId(null);
    }
  };

  return {
    editingCard,
    editingCardId,
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
    pastingColumnId,
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
    pasteCardToColumn,
    splitCardIntoSubtasks,
  };
}
