import { DragOverlay as DndDragOverlay } from "@dnd-kit/core";
import { getCardTopAccent, getColumnPastelHex } from "@/lib/kanbanPastel";
import type { Card, Column } from "@/lib/types";

type DragOverlayProps = {
  activeCard: Card | null;
  activeColumn: Column | null;
  activeColumnIndex?: number;
};

export function DragOverlay({
  activeCard,
  activeColumn,
  activeColumnIndex = 0,
}: DragOverlayProps) {
  const columnHeaderColor = getColumnPastelHex(activeColumnIndex);

  return (
    <DndDragOverlay adjustScale={false}>
      {activeCard ? (
        <article
          className={`w-[220px] cursor-grabbing border border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text)] shadow-lg ${getCardTopAccent(activeCard.id)}`}
        >
          <div className="relative flex w-full min-h-[80px] flex-col gap-1.5 p-4 text-left">
            <h3 className="w-full break-words text-sm font-semibold leading-tight text-[var(--app-text)]">
              {activeCard.title}
            </h3>
            {activeCard.description ? (
              <p className="w-full break-words whitespace-pre-wrap text-[11px] font-normal leading-snug text-[var(--app-text)] opacity-85">
                {activeCard.description}
              </p>
            ) : null}
          </div>
        </article>
      ) : null}
      {activeColumn && !activeCard ? (
        <section className="w-[220px] cursor-grabbing overflow-hidden rounded-xl border-2 border-dashed border-[var(--app-border)] bg-[var(--app-card)] shadow-lg">
          <div
            className="px-4 py-3 text-center text-sm font-semibold text-[#1A1A2E] rounded-t-xl"
            style={{ backgroundColor: columnHeaderColor }}
          >
            {activeColumn.title}
          </div>
          <div className="h-12 border-t border-[var(--app-border)] bg-[var(--app-card)]" />
        </section>
      ) : null}
    </DndDragOverlay>
  );
}
