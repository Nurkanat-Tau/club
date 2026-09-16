/**
 * Normalize a Kazakhstan mobile number to +77XXXXXXXXX.
 * Accepts "8 701 123 45 67", "+7 (701) 123-45-67", "7011234567", etc.
 * Returns null if it is not a valid KZ mobile number.
 */
export function normalizeKzPhone(raw: string): string | null {
  let d = (raw || "").replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("8")) d = "7" + d.slice(1);
  if (d.length === 10 && d.startsWith("7")) d = "7" + d;
  if (d.length !== 11 || !d.startsWith("77")) return null;
  return "+" + d;
}

/** "+77011234567" -> "+7 701 123 45 67" */
export function formatPhone(p: string): string {
  const d = p.replace(/\D/g, "");
  if (d.length !== 11) return p;
  return `+${d[0]} ${d.slice(1, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9, 11)}`;
}

/** WhatsApp deep link, optionally with prefilled text. */
export function waLink(phone: string, text?: string): string {
  const d = phone.replace(/\D/g, "");
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
