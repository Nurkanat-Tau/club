/**
 * Normalize a phone number.
 * - Kazakhstan mobiles in any common format ("8 701 123 45 67", "+7 (701) 123-45-67", "7011234567") → +77XXXXXXXXX
 * - Other countries must be typed with a leading "+" (or "00"): "+998 90 123 45 67" → +998901234567
 * Returns null if the number is not valid.
 */
export function normalizePhone(raw: string): string | null {
  const s = (raw || "").trim();
  let d = s.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("8")) d = "7" + d.slice(1);
  if (d.length === 10 && d.startsWith("7")) d = "7" + d;
  // KZ numbers: +7 7xx… Mobile codes are 70x, 74x–77x; 71x–73x are landlines (e.g. Shymkent 7252).
  if (d.length === 11 && d.startsWith("77")) return /^[123]$/.test(d[2]) ? null : "+" + d;
  const international = s.startsWith("+") || s.startsWith("00");
  if (international) {
    if (s.startsWith("00")) d = d.slice(2);
    // Russia (+7 9xx) and every other country: E.164, 10–15 digits. KZ landlines (+7 7xx but not 77x) are rejected.
    if (d.length >= 10 && d.length <= 15 && !(d.startsWith("7") && !d.startsWith("79"))) return "+" + d;
  }
  return null;
}

/** Kept for older code/tests: only Kazakhstan mobiles. */
export function normalizeKzPhone(raw: string): string | null {
  const p = normalizePhone(raw);
  return p && p.startsWith("+77") ? p : null;
}

/** "+77011234567" -> "+7 701 123 45 67"; other countries are shown as stored. */
export function formatPhone(p: string): string {
  const d = p.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("7")) return `+${d[0]} ${d.slice(1, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9, 11)}`;
  return p;
}

/** Formats while typing: "87011" -> "+7 701 1". Leaves "+998…" style input alone. */
export function formatPhoneInput(raw: string): string {
  const s = raw.trimStart();
  if (s.startsWith("+") && !s.startsWith("+7")) return s;
  if (s.startsWith("00")) return s;
  let d = s.replace(/\D/g, "");
  if (d.startsWith("8")) d = "7" + d.slice(1);
  else if (d && !d.startsWith("7")) d = "7" + d;
  d = d.slice(0, 11);
  const parts = [d.slice(0, 1), d.slice(1, 4), d.slice(4, 7), d.slice(7, 9), d.slice(9, 11)].filter(Boolean);
  return parts.length ? "+" + parts.join(" ") : "";
}

/** WhatsApp deep link, optionally with prefilled text. */
export function waLink(phone: string, text?: string): string {
  const d = phone.replace(/\D/g, "");
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
