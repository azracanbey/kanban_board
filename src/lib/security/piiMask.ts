/**
 * LLM'e gönderilmeden önce açıklamadaki olası PII'yi maskele (regex tabanlı).
 * Tam doğruluk garantisi değildir; yanlış pozitif/negatif olabilir.
 */
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/** TR cep: 05xx xxx xx xx veya bitişik 11 hane */
const PHONE_TR_RE =
  /\b(?:\+?90[\s.-]?)?(?:0?5\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}|\+?90\s?5\d{9}|05\d{9})\b/g;

/** 11 haneli TC kimlik numarası (başta 0 olmayan) */
const TC_RE = /\b[1-9]\d{10}\b/g;

export function maskPiiForLlm(text: string, maxLength = 12000): string {
  let out = text.slice(0, maxLength);
  out = out.replace(EMAIL_RE, "[EMAIL_REDACTED]");
  out = out.replace(PHONE_TR_RE, "[PHONE_REDACTED]");
  out = out.replace(TC_RE, (m) => (/^0\d{10}$/.test(m) ? m : "[TC_REDACTED]"));
  return out;
}
