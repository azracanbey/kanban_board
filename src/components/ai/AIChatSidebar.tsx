"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/providers";
import { createClient } from "@/lib/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
  action?: string | null;
}

interface Props {
  boardId?: string;
  onBoardUpdate?: () => void;
  onClose?: () => void;
}

function getWelcomeMessage(isTr: boolean, displayName: string) {
  const name = displayName.trim();
  if (name.length > 0) {
    return isTr
      ? `Merhaba ${name}! Ben TaskFlow asistanın. Sana board oluşturma, görevleri puanlama veya iş akışını yönetme konusunda nasıl yardımcı olabilirim?`
      : `Hi ${name}! I'm your TaskFlow assistant. How can I help with board setup, task scoring, or workflow management today?`;
  }

  return isTr
    ? "Merhaba! Ben TaskFlow asistanın. İstediğin her türlü proje yönetim desteği için buradayım. Sana nasıl yardımcı olabilirim?"
    : "Hi! I'm your TaskFlow assistant. I'm here for all kinds of project management support. How can I help?";
}

export default function AIChatSidebar({ boardId, onBoardUpdate, onClose }: Props) {
  const { locale } = useI18n();
  const isTr = locale === "tr";
  const [displayName, setDisplayName] = useState("");
  const userInitial = displayName.trim().charAt(0).toUpperCase();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: getWelcomeMessage(isTr, ""),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const supabase = createClient();
    const loadName = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user?.id) {
          setDisplayName("");
          return;
        }
        const { data } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .maybeSingle();
        setDisplayName((data?.display_name ?? "").trim());
      } catch {
        setDisplayName("");
      }
    };
    void loadName();
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setMessages((prev) => {
        if (prev.length === 1 && prev[0]?.role === "assistant") {
          return [{ role: "assistant", content: getWelcomeMessage(isTr, displayName) }];
        }
        return prev;
      });
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [boardId, displayName, isTr]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, boardId: boardId ?? null, locale }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || (isTr ? "Bir hata oluştu" : "Something went wrong"));
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply || (isTr ? "İşlem tamamlandı." : "Done."),
          action: data.action,
        },
      ]);

      if (data.action && boardId && typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("taskflow:board-mutated", {
            detail: {
              boardId,
              action: data.action,
              actionData: data.actionData ?? null,
            },
          }),
        );
      }

      if (data.action === "create_board" || data.action === "delete_board") {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("taskflow:boards-updated", {
              detail: { action: data.action, actionData: data.actionData ?? null },
            }),
          );
        }
      }

      if (!boardId && data.action && onBoardUpdate) onBoardUpdate();
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: isTr
            ? "İşlem başarısız oldu. Komutu veya hedef adı kontrol edip tekrar dener misin?"
            : "The action failed. Please check the command or target name and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text)]">
      <div className="border-b border-[var(--app-border)] px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[#CEFFC1]" />
            <span className="text-sm font-semibold text-[var(--app-text)]">
              {isTr ? "AI Asistan" : "AI Assistant"}
            </span>
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-xs font-medium text-[var(--app-text-muted)] transition hover:bg-[var(--app-column)] hover:text-[var(--app-text)]"
            >
              {isTr ? "Kapat" : "Close"}
            </button>
          ) : null}
        </div>
        <p className="mt-0.5 text-xs text-[var(--app-text-muted)]">
          {isTr ? "Board'unu doğal dille yönet" : "Manage your board with natural language"}
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-[#C1C7FF] text-[#2D2D5E]"
                  : "bg-[var(--app-column)] text-[var(--app-text)]"
              }`}
            >
              {msg.role === "assistant" && i === 0 ? (
                <div className="mb-1.5 flex items-center gap-2">
                  <div className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-card)] text-[11px] font-semibold text-[var(--app-text)]">
                    {userInitial || "👤"}
                  </div>
                  <span className="text-[11px] font-medium text-[var(--app-text-muted)]">
                    {isTr ? "TaskFlow Asistan" : "TaskFlow Assistant"}
                  </span>
                </div>
              ) : null}
              {msg.content}
              {msg.action && (
                <div className="mt-1 text-xs opacity-60">
                  ✓ {isTr ? "işlem uygulandı" : "action applied"}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-[var(--app-column)] px-3 py-2">
              <div className="flex gap-1">
                <span
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--app-text-muted)]"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--app-text-muted)]"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--app-text-muted)]"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-[var(--app-border)] px-4 py-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder={isTr ? "Bir komut yaz..." : "Type a command..."}
            disabled={loading}
            className="app-field app-field-input flex-1 rounded-xl text-sm disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="rounded-xl bg-[#C1C7FF] px-3 py-2 text-sm font-medium text-[#2D2D5E] transition-colors duration-200 hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isTr ? "Gönder" : "Send"}
          </button>
        </div>
        <p className="mt-1.5 text-xs text-[var(--app-text-muted)]">
          {boardId
            ? isTr
              ? 'Örnek: "Login kartını Done\'a taşı"'
              : 'Example: "Move the Login card to Done"'
            : isTr
              ? 'Örnek: "Bana Scrum board\'u oluştur"'
              : 'Example: "Create a Scrum board for me"'}
        </p>
      </div>
    </div>
  );
}
