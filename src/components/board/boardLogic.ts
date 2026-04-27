import type { Card, Column } from "@/lib/types";

export function formatBoardCreatedAt(createdAt: string | undefined | null, locale: "tr" | "en") {
  if (createdAt == null || createdAt === "") {
    return "-";
  }
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) {
    return "-";
  }
  return d.toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function groupCardsByColumn(columns: Column[], cards: Card[]) {
  const grouped = columns.reduce<Record<string, Card[]>>((acc, column) => {
    acc[column.id] = [];
    return acc;
  }, {});

  for (const card of cards) {
    if (grouped[card.column_id]) {
      grouped[card.column_id].push(card);
    }
  }

  for (const columnId of Object.keys(grouped)) {
    grouped[columnId].sort((a, b) => a.position - b.position);
  }

  return grouped;
}

export function getOverColumnId(overId: string, cardsById: Record<string, Card>) {
  if (overId.startsWith("column-drop-")) {
    return overId.replace("column-drop-", "");
  }

  if (overId.startsWith("column-sort-")) {
    return overId.replace("column-sort-", "");
  }

  return cardsById[overId]?.column_id ?? null;
}

export function getSortableColumnId(dndId: string, cardsById: Record<string, Card>) {
  if (dndId.startsWith("column-sort-")) {
    return dndId.replace("column-sort-", "");
  }

  if (dndId.startsWith("column-drop-")) {
    return dndId.replace("column-drop-", "");
  }

  return cardsById[dndId]?.column_id ?? null;
}
