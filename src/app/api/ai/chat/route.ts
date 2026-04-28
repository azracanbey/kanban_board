import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import { buildBoardContext } from "@/lib/ai/boardContext";
import { boardTools } from "@/lib/ai/tools";
import { createBoardFromTemplate } from "@/lib/createBoardFromTemplate";
import { persistColumnUrgencyOrder } from "@/lib/persistColumnUrgencyOrder";
import { clampUrgencyScoreOrDefault } from "@/lib/urgencyScore";
import { getNextBoardPositionForUser } from "@/lib/nextBoardPosition";
import { createClient } from "@/lib/supabase/server";
import {
  BOARD_TEMPLATE_DEFINITIONS,
  type BoardTemplateDefinition,
  resolveBoardTemplate,
} from "@/lib/templates";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[ı]/g, "i")
    .replace(/[ğ]/g, "g")
    .replace(/[ü]/g, "u")
    .replace(/[ş]/g, "s")
    .replace(/[ö]/g, "o")
    .replace(/[ç]/g, "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveByName<T extends { title: string }>(items: T[], rawName: string): T | null {
  const target = normalizeText(rawName);
  if (!target) return null;
  const exact = items.find((item) => normalizeText(item.title) === target);
  if (exact) return exact;
  const includes = items.find((item) => normalizeText(item.title).includes(target));
  if (includes) return includes;
  return null;
}

function parseDeterministicCommand(message: string) {
  const m = message.trim();
  const patterns: Array<{ type: "delete_column" | "delete_card"; re: RegExp }> = [
    { type: "delete_column", re: /^(.+?)\s+sutununu\s+sil$/i },
    { type: "delete_column", re: /^(.+?)\s+sutunu\s+sil$/i },
    { type: "delete_column", re: /^sil\s+(.+?)\s+sutununu?$/i },
    { type: "delete_column", re: /^delete\s+column\s+(.+)$/i },
    { type: "delete_card", re: /^(.+?)\s+kartini\s+sil$/i },
    { type: "delete_card", re: /^(.+?)\s+karti\s+sil$/i },
    { type: "delete_card", re: /^sil\s+(.+?)\s+kartini?$/i },
    { type: "delete_card", re: /^delete\s+card\s+(.+)$/i },
  ];

  const normalized = normalizeText(m);
  for (const p of patterns) {
    const hit = normalized.match(p.re);
    if (hit?.[1]) {
      return { type: p.type, name: hit[1].trim() } as const;
    }
  }
  return null;
}

function resolveTemplateDefinitionByInput(
  templateInput: string,
): BoardTemplateDefinition | null {
  const normalized = normalizeText(templateInput);
  const aliasToId: Record<string, string> = {
    kanban: "kanban",
    klasik: "kanban",
    classic: "kanban",
    scrum: "scrum",
    sprint: "scrum",
    marketing: "marketing",
    pazarlama: "marketing",
    personal: "personal",
    kisi: "personal",
    kisisel: "personal",
    empty: "empty",
    bos: "empty",
  };

  const directId = aliasToId[normalized] ?? normalized;
  const byId = BOARD_TEMPLATE_DEFINITIONS.find((d) => d.id === directId);
  if (byId) {
    return byId;
  }
  return null;
}

type MagicSplitPayload = {
  cardId: string;
  columnId: string;
  cardTitle: string;
  description: string;
} | null;

type ChatRequestBody = {
  message?: string;
  boardId?: string | null;
  locale?: "tr" | "en";
  magicSplit?: MagicSplitPayload;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseChatRequestBody(raw: unknown): ChatRequestBody | null {
  if (!isObject(raw)) {
    return null;
  }

  const message = typeof raw.message === "string" ? raw.message : undefined;
  const boardId =
    typeof raw.boardId === "string" || raw.boardId === null
      ? (raw.boardId as string | null)
      : undefined;
  const locale = raw.locale === "en" || raw.locale === "tr" ? raw.locale : undefined;

  let magicSplit: MagicSplitPayload = null;
  if (raw.magicSplit != null) {
    if (!isObject(raw.magicSplit)) {
      return null;
    }
    const cardId = typeof raw.magicSplit.cardId === "string" ? raw.magicSplit.cardId.trim() : "";
    const columnId =
      typeof raw.magicSplit.columnId === "string" ? raw.magicSplit.columnId.trim() : "";
    const cardTitle =
      typeof raw.magicSplit.cardTitle === "string" ? raw.magicSplit.cardTitle.trim() : "";
    const description =
      typeof raw.magicSplit.description === "string" ? raw.magicSplit.description : "";

    if (cardId === "" || columnId === "" || cardTitle === "") {
      return null;
    }

    magicSplit = { cardId, columnId, cardTitle, description };
  }

  return { message, boardId, locale, magicSplit };
}

type ParsedSubtaskRow = { title: string; description: string; urgency_score: number };

function extractSubtasksFromContent(content: string | null | undefined): ParsedSubtaskRow[] {
  if (!content) {
    return [];
  }

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch?.[0]) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as {
        subtasks?: Array<{ title?: string; description?: string; urgency_score?: unknown }>;
      };
      return (parsed.subtasks ?? [])
        .map((item) => ({
          title: (item.title ?? "").trim(),
          description: (item.description ?? "").trim(),
          urgency_score: clampUrgencyScoreOrDefault(item.urgency_score),
        }))
        .filter((item) => item.title.length > 0);
    } catch {
      // fall back to line parsing
    }
  }

  return content
    .split("\n")
    .map((line) => line.replace(/^[-*\d.)\s]+/, "").trim())
    .filter((line) => line.length > 0)
    .slice(0, 4)
    .map((line) => ({ title: line, description: "", urgency_score: 5 }));
}

export async function POST(req: NextRequest) {
  try {
    const parsedBody = parseChatRequestBody(await req.json());
    if (!parsedBody) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }
    const { message, boardId, locale, magicSplit } = parsedBody;
    const isTr = locale !== "en";
    const txt = (trText: string, enText: string) => (isTr ? trText : enText);
    const userMessage = message ?? "";
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: txt("Kullanıcı bulunamadı", "User not found") }, { status: 401 });
    }

    const { data: boards } = await supabase
      .from("boards")
      .select("id, title, created_at, user_id, position")
      .eq("user_id", user.id)
      .order("position", { ascending: false });

    if (!boardId) {
      const boardsText =
        (boards ?? [])
          .map((b) => `- "${b.title}" (ID: ${b.id})`)
          .join("\n") || "(board yok)";
      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        max_tokens: 512,
        tools: boardTools.map((t) => ({
          type: "function" as const,
          function: {
            name: t.name,
            description: t.description,
            parameters: t.input_schema,
          },
        })),
        messages: [
          {
            role: "system",
            content:
              `${isTr ? "Sen TaskFlow AI asistanısın." : "You are the TaskFlow AI assistant."}
Kullanıcı board seviyesinde işlem isteyebilir:
- "yeni board oluştur [ad]"
- "şablonla board oluştur [ad] [kanban|scrum|marketing|personal]"
- "board sil [ad]"
- "board listele"
Gerekli olduğunda uygun tool'u çağır.
Mevcut boardlar:
${boardsText}
${txt("Yanıtların kısa ve net Türkçe olsun.", "Reply in concise and clear English.")}`,
          },
          { role: "user", content: userMessage },
        ],
      });

      const choice = response.choices[0]?.message;
      const toolUse = choice?.tool_calls?.[0] || null;
      let actionResult: string | null = null;
      let actionData: Record<string, unknown> | null = null;
      let replyOverride: string | null = null;

      if (toolUse) {
        const input = JSON.parse(toolUse.function.arguments) as Record<string, string>;

        if (toolUse.function.name === "create_board") {
          const name = (input.name || "").trim();
          if (name.length >= 3 && name.length <= 100) {
            const nextPos = await getNextBoardPositionForUser(supabase, user.id);
            const { data: created, error } = await supabase
              .from("boards")
              .insert({ title: name, user_id: user.id, position: nextPos })
              .select("id, title, created_at, user_id, position")
              .single();
            if (!error && created) {
              actionResult = "create_board";
              actionData = { board: created };
              replyOverride = txt(`"${created.title}" board'u oluşturuldu.`, `Board "${created.title}" was created.`);
            } else {
              replyOverride = txt("Board oluşturulamadı. Lütfen tekrar dene.", "Board could not be created. Please try again.");
            }
          } else {
            replyOverride = txt("Board adı 3-100 karakter arasında olmalı.", "Board name must be between 3 and 100 characters.");
          }
        }

        if (toolUse.function.name === "create_board_from_template") {
          const name = (input.name || "").trim();
          const templateInput = (input.template || "").trim();
          const templateDef = resolveTemplateDefinitionByInput(templateInput);
          if (name.length < 3 || name.length > 100) {
            replyOverride = txt(
              "Board adı 3-100 karakter arasında olmalı.",
              "Board name must be between 3 and 100 characters.",
            );
          } else if (!templateDef) {
            replyOverride = txt(
              `Şablon bulunamadı: "${templateInput}".`,
              `Template not found: "${templateInput}".`,
            );
          } else {
            const template = resolveBoardTemplate(templateDef, isTr ? "tr" : "en");
            const createdResult = await createBoardFromTemplate(
              supabase,
              user.id,
              name,
              template,
            );
            if ("error" in createdResult) {
              replyOverride = txt(
                "Şablon ile board oluşturulamadı.",
                "Could not create board from template.",
              );
            } else {
              const { data: createdBoard } = await supabase
                .from("boards")
                .select("id, title, created_at, user_id, position")
                .eq("id", createdResult.boardId)
                .single();
              actionResult = "create_board";
              actionData = { board: createdBoard ?? { id: createdResult.boardId, title: name } };
              replyOverride = txt(
                `"${name}" board'u "${template.name}" şablonuyla oluşturuldu.`,
                `Board "${name}" was created with "${template.name}" template.`,
              );
            }
          }
        }

        if (toolUse.function.name === "delete_board") {
          const name = (input.name || "").trim();
          const { data: candidates } = await supabase
            .from("boards")
            .select("id, title")
            .eq("user_id", user.id)
            .ilike("title", name)
            .order("position", { ascending: false })
            .limit(1);
          const target = candidates?.[0];
          if (target) {
            const { error, data: deleted } = await supabase
              .from("boards")
              .delete()
              .eq("id", target.id)
              .select("id, title");
            if (!error && deleted && deleted.length > 0) {
              actionResult = "delete_board";
              actionData = { boardId: target.id, boardTitle: target.title };
              replyOverride = txt(`"${target.title}" board'u silindi.`, `Board "${target.title}" was deleted.`);
            } else {
              replyOverride = txt(`"${target.title}" board'u silinemedi.`, `Board "${target.title}" could not be deleted.`);
            }
          } else {
            replyOverride = txt(`"${name}" adında board bulunamadı.`, `No board named "${name}" was found.`);
          }
        }

        if (toolUse.function.name === "list_boards") {
          actionResult = "list_boards";
          actionData = { boards: boards ?? [] };
          replyOverride =
            boards && boards.length > 0
              ? `${txt("Boardlar", "Boards")}:\n${boards.map((b) => `- ${b.title}`).join("\n")}`
              : txt("Henüz board yok.", "There are no boards yet.");
        }
      }

      return NextResponse.json({
        reply: replyOverride || choice?.content || txt("Komutu anlayamadım. Daha açık yazabilir misin?", "I could not understand the command. Can you be more specific?"),
        action: actionResult,
        actionData,
        toolName: toolUse?.function.name || null,
      });
    }

    const { data: board, error: boardFetchError } = await supabase
      .from("boards")
      .select("*")
      .eq("id", boardId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (boardFetchError || !board) {
      return NextResponse.json({ error: txt("Board bulunamadı", "Board not found") }, { status: 404 });
    }

    const { data: columns } = await supabase
      .from("columns")
      .select("*")
      .eq("board_id", boardId)
      .order("position");

    const { data: cards } = await supabase
      .from("cards")
      .select("*")
      .in(
        "column_id",
        (columns || []).map((c) => c.id),
      )
      .order("position");

    if (!columns) {
      return NextResponse.json({ error: txt("Board bulunamadı", "Board not found") }, { status: 404 });
    }

    if (magicSplit) {
      const targetCard = (cards ?? []).find((card) => card.id === magicSplit.cardId);
      if (!targetCard || targetCard.column_id !== magicSplit.columnId) {
        return NextResponse.json(
          { error: txt("Kart bulunamadı.", "Card not found.") },
          { status: 404 },
        );
      }

      const sourceDescription = String(targetCard.description ?? "").trim();
      if (targetCard.ai_magic_applied === true) {
        return NextResponse.json({
          reply: txt(
            "AI Magic bu karta zaten uygulandı; aynı karta veya AI ile oluşan alt görevlere tekrar uygulanamaz.",
            "AI Magic was already applied to this card; it cannot be applied again to the same card or AI-generated subtasks.",
          ),
          action: null,
          actionData: null,
          toolName: "split_card_into_subtasks",
        });
      }

      if (sourceDescription.length < 8) {
        return NextResponse.json({
          reply: txt(
            "Kart açıklaması çok kısa. AI parçalama için daha detaylı bir açıklama gerekli.",
            "Card description is too short. Please provide more detail for AI splitting.",
          ),
          action: null,
          actionData: null,
          toolName: "split_card_into_subtasks",
        });
      }

      const dbCardTitle = String(targetCard.title ?? "").trim() || magicSplit.cardTitle;

      const splitResponse = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        max_tokens: 700,
        tools: boardTools
          .filter((tool) => tool.name === "split_card_into_subtasks")
          .map((tool) => ({
            type: "function" as const,
            function: {
              name: tool.name,
              description: tool.description,
              parameters: tool.input_schema,
            },
          })),
        messages: [
          {
            role: "system",
            content: txt(
              "Sen TaskFlow AI asistanısın. Verilen kart açıklamasını 3 veya 4 net alt göreve böl. Her alt görev kısa ve uygulanabilir olsun. Görevin karmaşıklığı ve önemine göre ana kart için parent_urgency_score ve her alt görev için urgency_score (1-10, 10 en acil) ata. Yalnızca split_card_into_subtasks tool'unu çağır.",
              "You are the TaskFlow AI assistant. Split the card description into 3 or 4 actionable subtasks. Assign parent_urgency_score for the source card and urgency_score (1-10, 10 most urgent) for each subtask based on complexity and importance. Only call split_card_into_subtasks.",
            ),
          },
          {
            role: "user",
            content: txt(
              `Kart başlığı: ${dbCardTitle}\nKart açıklaması:\n${sourceDescription}\n\nBu kartı 3-4 alt göreve böl; her alt görev ve ana kart için 1-10 aciliyet puanı ver.`,
              `Card title: ${dbCardTitle}\nCard description:\n${sourceDescription}\n\nSplit into 3-4 subtasks and provide urgency scores (1-10) for the parent and each subtask.`,
            ),
          },
        ],
      });

      const splitTool = splitResponse.choices[0]?.message?.tool_calls?.[0] ?? null;
      type SplitToolArgs = {
        column_id?: string;
        parent_urgency_score?: unknown;
        subtasks?: Array<{ title?: string; description?: string; urgency_score?: unknown }>;
      };

      let splitArgs: SplitToolArgs = { column_id: magicSplit.columnId };
      if (splitTool && splitTool.function.name === "split_card_into_subtasks") {
        try {
          splitArgs = JSON.parse(splitTool.function.arguments || "{}") as SplitToolArgs;
        } catch {
          splitArgs = { column_id: magicSplit.columnId };
        }
      }

      const toolSubtasks = (splitArgs.subtasks ?? [])
        .map((item) => ({
          title: (item.title ?? "").trim(),
          description: (item.description ?? "").trim(),
          urgency_score: clampUrgencyScoreOrDefault(item.urgency_score),
        }))
        .filter((item) => item.title.length > 0);

      const textFallbackSubtasks = extractSubtasksFromContent(splitResponse.choices[0]?.message?.content);
      const sanitizedSubtasks = (toolSubtasks.length > 0 ? toolSubtasks : textFallbackSubtasks).slice(0, 4);

      if (sanitizedSubtasks.length < 3) {
        return NextResponse.json({
          reply: txt(
            "AI yeterli alt görev üretemedi. Lütfen açıklamayı genişletip tekrar dene.",
            "AI could not generate enough subtasks. Please expand the description and try again.",
          ),
          action: null,
          actionData: null,
          toolName: "split_card_into_subtasks",
        });
      }

      const targetColumnId = magicSplit.columnId;
      const columnExists = (columns ?? []).some((column) => column.id === targetColumnId);
      if (!columnExists) {
        return NextResponse.json({
          reply: txt("Hedef sütun bulunamadı.", "Target column was not found."),
          action: null,
          actionData: null,
          toolName: "split_card_into_subtasks",
        });
      }
      const sameColumnCards = (cards ?? [])
        .filter((card) => card.column_id === targetColumnId)
        .sort((a, b) => a.position - b.position);
      let basePosition = sameColumnCards.length > 0 ? sameColumnCards[sameColumnCards.length - 1].position : 0;

      const rowsToInsert = sanitizedSubtasks.map((item) => {
        basePosition += 1000;
        return {
          column_id: targetColumnId,
          title: item.title.slice(0, 120),
          description: item.description,
          position: basePosition,
          urgency_score: item.urgency_score,
          ai_magic_applied: true,
        };
      });

      const { data: createdCards, error: createError } = await supabase
        .from("cards")
        .insert(rowsToInsert)
        .select("id, column_id, title, description, position, created_at, urgency_score, ai_magic_applied");

      if (createError || !createdCards || createdCards.length === 0) {
        return NextResponse.json({
          reply: txt(
            `Alt görev kartları oluşturulamadı. ${createError?.message ?? ""}`.trim(),
            `Failed to create subtask cards. ${createError?.message ?? ""}`.trim(),
          ),
          action: null,
          actionData: null,
          toolName: "split_card_into_subtasks",
        });
      }

      const parentUrgency = clampUrgencyScoreOrDefault(splitArgs.parent_urgency_score, 5);
      await supabase
        .from("cards")
        .update({ urgency_score: parentUrgency, ai_magic_applied: true })
        .eq("id", targetCard.id);

      let columnCardsOrdered = await persistColumnUrgencyOrder(supabase, targetColumnId);
      if (!columnCardsOrdered || columnCardsOrdered.length === 0) {
        const { data: fallback } = await supabase
          .from("cards")
          .select("id, column_id, title, description, position, created_at, urgency_score, ai_magic_applied")
          .eq("column_id", targetColumnId)
          .order("position", { ascending: true });
        columnCardsOrdered = (fallback ?? []) as typeof columnCardsOrdered;
      }
      const createdIds = createdCards.map((c) => c.id);

      return NextResponse.json({
        reply: txt(
          `"${dbCardTitle}" kartı ${createdCards.length} alt göreve bölündü.`,
          `"${dbCardTitle}" was split into ${createdCards.length} subtasks.`,
        ),
        action: "create_subtasks",
        actionData: {
          columnId: targetColumnId,
          createdCards,
          columnCards: columnCardsOrdered ?? [],
          createdCardIds: createdIds,
        },
        toolName: "split_card_into_subtasks",
      });
    }

    const systemPrompt = `${buildBoardContext(board, columns, cards || [])}
${txt("Yanıtlarını Türkçe ver.", "Reply in English.")}`;

    const deterministic = parseDeterministicCommand(userMessage);

    if (deterministic?.type === "delete_column") {
      const target = resolveByName(columns, deterministic.name);
      if (!target) {
        return NextResponse.json({
          reply: txt(`"${deterministic.name}" adında sütun bulunamadı.`, `No column named "${deterministic.name}" was found.`),
          action: null,
          actionData: null,
          toolName: "delete_column",
        });
      }
      const { error, data: deleted } = await supabase
        .from("columns")
        .delete()
        .eq("id", target.id)
        .select("id, title");

      if (error || !deleted || deleted.length === 0) {
        return NextResponse.json({
          reply: txt(`"${target.title}" sütunu silinemedi.`, `Column "${target.title}" could not be deleted.`),
          action: null,
          actionData: null,
          toolName: "delete_column",
        });
      }

      return NextResponse.json({
        reply: txt(`"${target.title}" sütunu silindi.`, `Column "${target.title}" was deleted.`),
        action: "delete_column",
        actionData: { columnId: target.id, columnTitle: target.title },
        toolName: "delete_column",
      });
    }

    if (deterministic?.type === "delete_card") {
      const target = resolveByName(cards || [], deterministic.name);
      if (!target) {
        return NextResponse.json({
          reply: txt(`"${deterministic.name}" adında kart bulunamadı.`, `No card named "${deterministic.name}" was found.`),
          action: null,
          actionData: null,
          toolName: "delete_card",
        });
      }

      const { error, data: deleted } = await supabase
        .from("cards")
        .delete()
        .eq("id", target.id)
        .select("id, title");

      if (error || !deleted || deleted.length === 0) {
        return NextResponse.json({
          reply: txt(`"${target.title}" kartı silinemedi.`, `Card "${target.title}" could not be deleted.`),
          action: null,
          actionData: null,
          toolName: "delete_card",
        });
      }

      return NextResponse.json({
        reply: txt(`"${target.title}" kartı silindi.`, `Card "${target.title}" was deleted.`),
        action: "delete_card",
        actionData: { cardId: target.id, cardTitle: target.title },
        toolName: "delete_card",
      });
    }

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1024,
      tools: boardTools.map((t) => ({
        type: "function" as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.input_schema,
        },
      })),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    const choice = response.choices[0]?.message;
    const toolUse = choice?.tool_calls?.[0] || null;
    const textBlock = choice?.content || null;

    let actionResult: string | null = null;
    let actionData: Record<string, unknown> | null = null;
    let replyOverride: string | null = null;

    if (toolUse) {
      const input = JSON.parse(toolUse.function.arguments) as Record<string, string>;

      if (toolUse.function.name === "move_card") {
        const columnCards = (cards || [])
          .filter((c) => c.column_id === input.target_column_id)
          .sort((a, b) => a.position - b.position);
        const newPosition =
          columnCards.length > 0 ? columnCards[columnCards.length - 1].position + 1000 : 1000;

        const { error, data: updated } = await supabase
          .from("cards")
          .update({
            column_id: input.target_column_id,
            position: newPosition,
          })
          .eq("id", input.card_id)
          .select("id, column_id, position");

        if (!error && updated && updated.length > 0) {
          actionResult = "move_card";
          replyOverride = txt("Kart taşındı.", "Card moved.");
        } else {
          replyOverride = txt("Kart taşınamadı. Kart bulunamadı veya işlem başarısız oldu.", "Card could not be moved. Card not found or operation failed.");
        }
      }

      if (toolUse.function.name === "create_card") {
        const columnCards = (cards || [])
          .filter((c) => c.column_id === input.column_id)
          .sort((a, b) => a.position - b.position);
        const newPosition =
          columnCards.length > 0 ? columnCards[columnCards.length - 1].position + 1000 : 1000;

        const { error, data: created } = await supabase.from("cards").insert({
          column_id: input.column_id,
          title: input.title,
          description: input.description || "",
          position: newPosition,
        }).select("id, title").single();

        if (!error && created) {
          actionResult = "create_card";
          actionData = { cardId: created.id, cardTitle: created.title };
          replyOverride = txt(`"${created.title}" kartı oluşturuldu.`, `Card "${created.title}" was created.`);
        } else {
          replyOverride = txt("Kart oluşturulamadı.", "Card could not be created.");
        }
      }

      if (toolUse.function.name === "create_column") {
        const lastColumn = (columns || []).sort((a, b) => a.position - b.position).at(-1);
        const newPosition = lastColumn ? lastColumn.position + 1000 : 1000;

        const { error, data: created } = await supabase.from("columns").insert({
          board_id: boardId,
          title: input.title,
          position: newPosition,
        }).select("id, title").single();

        if (!error && created) {
          actionResult = "create_column";
          actionData = { columnId: created.id, columnTitle: created.title };
          replyOverride = txt(`"${created.title}" sütunu oluşturuldu.`, `Column "${created.title}" was created.`);
        } else {
          replyOverride = txt("Sütun oluşturulamadı.", "Column could not be created.");
        }
      }

      if (toolUse.function.name === "delete_card") {
        const { error, data: deleted } = await supabase
          .from("cards")
          .delete()
          .eq("id", input.card_id)
          .select("id, title");
        if (!error && deleted && deleted.length > 0) {
          actionResult = "delete_card";
          actionData = { cardId: deleted[0]?.id, cardTitle: deleted[0]?.title };
          replyOverride = txt(`"${deleted[0]?.title ?? "Kart"}" silindi.`, `"${deleted[0]?.title ?? "Card"}" was deleted.`);
        } else {
          replyOverride = txt("Kart silinemedi. Kart bulunamadı.", "Card could not be deleted. Card was not found.");
        }
      }

      if (toolUse.function.name === "delete_column") {
        const columnName = (input.column_name || "").trim();
        const target = resolveByName(columns, columnName);
        if (!target) {
          replyOverride = txt(`"${columnName}" adında sütun bulunamadı.`, `No column named "${columnName}" was found.`);
        } else {
          const { error, data: deleted } = await supabase
            .from("columns")
            .delete()
            .eq("id", target.id)
            .select("id, title");
          if (!error && deleted && deleted.length > 0) {
            actionResult = "delete_column";
            actionData = { columnId: target.id, columnTitle: target.title };
            replyOverride = txt(`"${target.title}" sütunu silindi.`, `Column "${target.title}" was deleted.`);
          } else {
            replyOverride = txt(`"${target.title}" sütunu silinemedi.`, `Column "${target.title}" could not be deleted.`);
          }
        }
      }

      if (toolUse.function.name === "create_board") {
        const name = (input.name || "").trim();
        if (name.length >= 3 && name.length <= 100) {
          const nextPos = await getNextBoardPositionForUser(supabase, user.id);
          const { data: created, error } = await supabase
            .from("boards")
            .insert({ title: name, user_id: user.id, position: nextPos })
            .select("id, title, created_at, user_id, position")
            .single();
          if (!error && created) {
            actionResult = "create_board";
            actionData = { board: created };
            replyOverride = txt(`"${created.title}" board'u oluşturuldu.`, `Board "${created.title}" was created.`);
          } else {
            replyOverride = txt("Board oluşturulamadı.", "Board could not be created.");
          }
        }
      }

      if (toolUse.function.name === "create_board_from_template") {
        const name = (input.name || "").trim();
        const templateInput = (input.template || "").trim();
        const templateDef = resolveTemplateDefinitionByInput(templateInput);
        if (name.length < 3 || name.length > 100) {
          replyOverride = txt(
            "Board adı 3-100 karakter arasında olmalı.",
            "Board name must be between 3 and 100 characters.",
          );
        } else if (!templateDef) {
          replyOverride = txt(
            `Şablon bulunamadı: "${templateInput}".`,
            `Template not found: "${templateInput}".`,
          );
        } else {
          const template = resolveBoardTemplate(templateDef, isTr ? "tr" : "en");
          const createdResult = await createBoardFromTemplate(
            supabase,
            user.id,
            name,
            template,
          );
          if ("error" in createdResult) {
            replyOverride = txt(
              "Şablon ile board oluşturulamadı.",
              "Could not create board from template.",
            );
          } else {
            const { data: createdBoard } = await supabase
              .from("boards")
              .select("id, title, created_at, user_id, position")
              .eq("id", createdResult.boardId)
              .single();
            actionResult = "create_board";
            actionData = { board: createdBoard ?? { id: createdResult.boardId, title: name } };
            replyOverride = txt(
              `"${name}" board'u "${template.name}" şablonuyla oluşturuldu.`,
              `Board "${name}" was created with "${template.name}" template.`,
            );
          }
        }
      }

      if (toolUse.function.name === "delete_board") {
        const name = (input.name || "").trim();
        const { data: candidates } = await supabase
          .from("boards")
          .select("id, title")
          .eq("user_id", user.id)
          .ilike("title", name)
          .order("position", { ascending: false })
          .limit(1);
        const target = candidates?.[0];
        if (target) {
          const { error, data: deleted } = await supabase
            .from("boards")
            .delete()
            .eq("id", target.id)
            .select("id, title");
          if (!error && deleted && deleted.length > 0) {
            actionResult = "delete_board";
            actionData = { boardId: target.id, boardTitle: target.title };
            replyOverride = txt(`"${target.title}" board'u silindi.`, `Board "${target.title}" was deleted.`);
          } else {
            replyOverride = txt(`"${target.title}" board'u silinemedi.`, `Board "${target.title}" could not be deleted.`);
          }
        } else {
          replyOverride = txt(`"${name}" adında board bulunamadı.`, `No board named "${name}" was found.`);
        }
      }

      if (toolUse.function.name === "list_boards") {
        actionResult = "list_boards";
        actionData = { boards: boards ?? [] };
        replyOverride =
          boards && boards.length > 0
            ? `${txt("Boardlar", "Boards")}:\n${boards.map((b) => `- ${b.title}`).join("\n")}`
            : txt("Henüz board yok.", "There are no boards yet.");
      }
    }

    return NextResponse.json({
      reply: replyOverride || textBlock || txt("Komutu anlayamadım. Daha açık yazabilir misin?", "I could not understand the command. Can you be more specific?"),
      action: actionResult,
      actionData,
      toolName: toolUse?.function.name || null,
    });
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
