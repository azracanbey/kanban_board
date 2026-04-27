import DOMPurify from "isomorphic-dompurify";

/** Kullanıcı / LLM metninden HTML etiketlerini kaldırır (XSS katmanı). */
export function sanitizePlainText(input: string | null | undefined, maxLength = 20000): string {
  const raw = input ?? "";
  const stripped = DOMPurify.sanitize(raw, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  return stripped.slice(0, maxLength);
}
