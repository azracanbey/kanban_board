"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/providers";
import { createBoardFromTemplate } from "@/lib/createBoardFromTemplate";
import { createClient } from "@/lib/supabase/client";
import {
  BOARD_TEMPLATE_DEFINITIONS,
  getTemplateDefinitionById,
  resolveBoardTemplate,
} from "@/lib/templates";
import type { Board } from "@/lib/types";

type BoardsPageClientProps = {
  userId: string;
  initialBoards: Board[];
  initialError: string | null;
};

type CreateStep = "template" | "name";

const templateCardClass =
  "rounded-2xl border-2 border-[var(--app-border)] bg-[var(--app-column)] p-4 text-left text-[var(--app-text)] shadow-sm transition-all hover:border-[#C1C7FF] dark:shadow-none dark:hover:border-[#C1C7FF]";

const templateCardSelectedClass =
  "border-[#C1C7FF] ring-2 ring-[#C1C7FF]/80 ring-offset-2 ring-offset-[var(--app-page)] dark:border-[#C1C7FF] dark:ring-[#C1C7FF]/80 dark:ring-offset-[var(--app-page)]";

export function BoardsPageClient({
  initialBoards,
  initialError,
  userId,
}: BoardsPageClientProps) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [boards, setBoards] = useState<Board[]>(initialBoards);
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingBoardId, setDeletingBoardId] = useState<string | null>(null);
  const [updatingBoardId, setUpdatingBoardId] = useState<string | null>(null);
  const [pendingDeleteBoardId, setPendingDeleteBoardId] = useState<string | null>(
    null,
  );
  const [pendingEditBoardId, setPendingEditBoardId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editTitleError, setEditTitleError] = useState("");

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createStep, setCreateStep] = useState<CreateStep>("template");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const resolvedTemplates = useMemo(
    () =>
      BOARD_TEMPLATE_DEFINITIONS.map((def) => resolveBoardTemplate(def, locale)),
    [locale],
  );

  const selectedPreview = useMemo(() => {
    if (!selectedTemplateId) return null;
    const def = getTemplateDefinitionById(selectedTemplateId);
    return def ? resolveBoardTemplate(def, locale) : null;
  }, [selectedTemplateId, locale]);

  const resetCreateModal = () => {
    setCreateModalOpen(false);
    setCreateStep("template");
    setSelectedTemplateId(null);
    setTitle("");
    setTitleError("");
  };

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{
        action?: string;
        actionData?: {
          board?: Board | null;
          boardId?: string;
        } | null;
      }>;
      const action = custom.detail?.action;
      const actionData = custom.detail?.actionData;

      if (action === "create_board" && actionData?.board) {
        const board = actionData.board as Board;
        setBoards((prev) => {
          const exists = prev.some((b) => b.id === board.id);
          return exists ? prev : [board, ...prev];
        });
      }

      if (action === "delete_board" && actionData?.boardId) {
        const boardId = actionData.boardId;
        setBoards((prev) => prev.filter((b) => b.id !== boardId));
      }
    };

    window.addEventListener("taskflow:boards-updated", handler as EventListener);
    return () => window.removeEventListener("taskflow:boards-updated", handler as EventListener);
  }, []);

  const validate = () => {
    const trimmed = title.trim();

    if (trimmed.length < 3) {
      setTitleError(t("boards.validationTitle"));
      return false;
    }

    if (trimmed.length > 100) {
      setTitleError(t("boards.validationTitle"));
      return false;
    }

    setTitleError("");
    return true;
  };

  const validateBoardTitle = (value: string) => {
    const trimmed = value.trim();

    if (trimmed.length < 3 || trimmed.length > 100) {
      return t("boards.validationTitle");
    }
    return "";
  };

  const handleCreateFromTemplate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!userId) {
      setErrorMessage(t("boards.errorNoUser"));
      return;
    }

    if (!selectedTemplateId) {
      setErrorMessage(t("boards.chooseTemplate"));
      return;
    }

    const definition = getTemplateDefinitionById(selectedTemplateId);
    if (!definition) {
      setErrorMessage(t("boards.chooseTemplate"));
      return;
    }

    if (!validate()) {
      return;
    }

    const trimmedTitle = title.trim();
    const templateForDb = resolveBoardTemplate(definition, locale);
    setIsCreating(true);

    try {
      const result = await createBoardFromTemplate(
        supabase,
        userId,
        trimmedTitle,
        templateForDb,
      );

      if ("error" in result) {
        setErrorMessage(result.error);
        return;
      }

      const newBoard: Board = {
        id: result.boardId,
        title: trimmedTitle,
        created_at: new Date().toISOString(),
        user_id: userId,
        position: result.position,
      };
      setBoards((prev) => [newBoard, ...prev]);
      resetCreateModal();
      router.push(`/boards/${result.boardId}`);
      router.refresh();
    } catch {
      setErrorMessage(t("boards.errorCreate"));
    } finally {
      setIsCreating(false);
    }
  };

  const performDeleteBoard = async (boardId: string) => {
    setErrorMessage(null);
    setDeletingBoardId(boardId);

    const previousBoards = boards;
    setBoards((prev) => prev.filter((board) => board.id !== boardId));

    try {
      const { error } = await supabase.from("boards").delete().eq("id", boardId);

      if (error) {
        setBoards(previousBoards);
        setErrorMessage(error.message);
      }
    } catch {
      setBoards(previousBoards);
      setErrorMessage(t("boards.errorDelete"));
    } finally {
      setDeletingBoardId(null);
      setPendingDeleteBoardId(null);
    }
  };

  const openEditBoardModal = (board: Board) => {
    setPendingEditBoardId(board.id);
    setEditTitle(board.title);
    setEditTitleError("");
    setErrorMessage(null);
  };

  const performUpdateBoard = async () => {
    if (!pendingEditBoardId) {
      return;
    }

    const validationError = validateBoardTitle(editTitle);
    if (validationError) {
      setEditTitleError(validationError);
      return;
    }

    setEditTitleError("");
    setErrorMessage(null);
    setUpdatingBoardId(pendingEditBoardId);

    const trimmedTitle = editTitle.trim();
    const previousBoards = boards;
    setBoards((prev) =>
      prev.map((board) =>
        board.id === pendingEditBoardId ? { ...board, title: trimmedTitle } : board,
      ),
    );

    try {
      const { error } = await supabase
        .from("boards")
        .update({ title: trimmedTitle })
        .eq("id", pendingEditBoardId)
        .eq("user_id", userId);

      if (error) {
        setBoards(previousBoards);
        setErrorMessage(error.message);
        return;
      }

      setPendingEditBoardId(null);
    } catch {
      setBoards(previousBoards);
      setErrorMessage(t("boards.errorCreate"));
    } finally {
      setUpdatingBoardId(null);
    }
  };

  return (
    <section className="space-y-4 text-[var(--app-text)]">
      <div className="surface-panel p-4">
        <h1 className="text-xl font-bold text-[var(--app-text)]">
          {t("boards.heading")}
        </h1>
        <p className="mt-1 text-sm text-[var(--app-text-muted)]">
          {t("boards.subtitle")}
        </p>

        <div className="mt-4">
          <Button
            type="button"
            onClick={() => {
              setErrorMessage(null);
              setCreateModalOpen(true);
              setCreateStep("template");
              setSelectedTemplateId(null);
              setTitle("");
              setTitleError("");
            }}
            disabled={!userId}
          >
            {t("boards.create")}
          </Button>
        </div>

        {errorMessage && !createModalOpen ? (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50/90 p-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
            {errorMessage}
          </p>
        ) : null}
      </div>

      <div className="surface-panel p-4">
        {boards.length === 0 ? (
          <p className="text-sm text-[var(--app-text-muted)]">
            {t("boards.empty")}
          </p>
        ) : (
          <ul className="space-y-2">
            {boards.map((board) => (
              <li
                key={board.id}
                className="flex flex-col gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-column)] p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[var(--app-text)]">
                    {board.title}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/boards/${board.id}`}
                    className="inline-flex h-10 min-w-[4.5rem] items-center justify-center rounded-xl bg-[#C1C7FF] px-4 text-sm font-medium text-[#1A1A2E] ring-1 ring-[#a8b0e8] transition hover:brightness-95 dark:bg-[#3A3F5C] dark:text-[#F1F3F9] dark:ring-[#4A5070]"
                  >
                    {t("common.open")}
                  </Link>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => openEditBoardModal(board)}
                    disabled={deletingBoardId !== null || updatingBoardId !== null}
                  >
                    {t("common.edit")}
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => setPendingDeleteBoardId(board.id)}
                    isLoading={deletingBoardId === board.id}
                    disabled={deletingBoardId !== null}
                  >
                    {t("common.delete")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        isOpen={createModalOpen}
        onClose={() => {
          if (!isCreating) {
            resetCreateModal();
          }
        }}
        title={
          createStep === "template"
            ? t("boards.chooseTemplate")
            : t("boards.nameYourBoard")
        }
      >
        {createStep === "template" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                type="button"
                variant="secondary"
                className="min-h-11"
                disabled={isCreating}
                onClick={() => {
                  resetCreateModal();
                  router.back();
                }}
              >
                {t("boards.backDismiss")}
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {resolvedTemplates.map((tpl) => {
                const selected = selectedTemplateId === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(tpl.id)}
                    className={`${templateCardClass} cursor-pointer ${selected ? templateCardSelectedClass : ""}`.trim()}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl leading-none" aria-hidden>
                        {tpl.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[var(--app-text)]">{tpl.name}</p>
                        <p className="mt-1 text-xs text-[var(--app-text-muted)]">
                          {tpl.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {errorMessage ? (
              <p className="rounded-md border border-red-200 bg-red-50/90 p-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
                {errorMessage}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => resetCreateModal()}
                disabled={isCreating}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={!selectedTemplateId}
                onClick={() => {
                  setErrorMessage(null);
                  setCreateStep("name");
                }}
              >
                {t("boards.continueToName")}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateFromTemplate} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                type="button"
                variant="secondary"
                className="min-h-11"
                disabled={isCreating}
                onClick={() => {
                  resetCreateModal();
                  router.back();
                }}
              >
                {t("boards.backDismiss")}
              </Button>
            </div>
            {selectedPreview ? (
              <div
                className={`${templateCardClass} pointer-events-none opacity-90 ${templateCardSelectedClass}`.trim()}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl leading-none" aria-hidden>
                    {selectedPreview.icon}
                  </span>
                  <div>
                    <p className="font-semibold text-[var(--app-text)]">
                      {selectedPreview.name}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--app-text-muted)]">
                      {selectedPreview.description}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <Input
              id="board-title-modal"
              label={t("boards.boardTitle")}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("boards.placeholderBoard")}
              error={titleError}
              required
              autoFocus
            />

            {errorMessage ? (
              <p className="rounded-md border border-red-200 bg-red-50/90 p-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
                {errorMessage}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setErrorMessage(null);
                  setCreateStep("template");
                }}
                disabled={isCreating}
              >
                {t("boards.backToTemplates")}
              </Button>
              <Button type="submit" isLoading={isCreating} disabled={!userId}>
                {t("boards.createAndOpen")}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(pendingEditBoardId)}
        onClose={() => {
          if (updatingBoardId === null) {
            setPendingEditBoardId(null);
            setEditTitleError("");
          }
        }}
        title={t("common.edit")}
      >
        <div className="space-y-4">
          <Input
            id="edit-board-title"
            label={t("boards.boardTitle")}
            value={editTitle}
            onChange={(event) => setEditTitle(event.target.value)}
            placeholder={t("boards.placeholderBoard")}
            error={editTitleError}
            required
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setPendingEditBoardId(null);
                setEditTitleError("");
              }}
              disabled={updatingBoardId !== null}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => void performUpdateBoard()}
              isLoading={updatingBoardId !== null}
            >
              {t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(pendingDeleteBoardId)}
        onClose={() => setPendingDeleteBoardId(null)}
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
              onClick={() => setPendingDeleteBoardId(null)}
              disabled={deletingBoardId !== null}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                if (pendingDeleteBoardId) {
                  void performDeleteBoard(pendingDeleteBoardId);
                }
              }}
              isLoading={deletingBoardId !== null}
            >
              {t("common.yesDelete")}
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
