/** Russian plural: plural(5, ["участник", "участника", "участников"]) -> "участников" */
export function plural(n: number, forms: [string, string, string]): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}

export const countLabel = (n: number, forms: [string, string, string]) => `${n} ${plural(n, forms)}`;
export const MEMBERS: [string, string, string] = ["участник", "участника", "участников"];
export const PLACES: [string, string, string] = ["место", "места", "мест"];
export const EVENTS: [string, string, string] = ["встреча", "встречи", "встреч"];

/** "https://instagram.com/tennis.shym/?hl=ru" | "@tennis.shym" -> "tennis.shym" */
export function normalizeInstagram(raw: string): string | null {
  let v = raw.trim();
  if (!v) return null;
  v = v.replace(/^(https?:\/\/)?(www\.|m\.)?(instagram\.com|instagr\.am)\//i, "");
  v = v.replace(/^@/, "").split(/[/?#]/)[0];
  return /^[A-Za-z0-9._]{1,30}$/.test(v) ? v : null;
}

/** "2000" -> "2 000 ₸"; "" -> null (free); other text kept as typed. */
export function normalizePrice(raw: string): string | null {
  const v = raw.trim();
  if (!v || /^(0|бесплатно|free|тегін)$/i.test(v)) return null;
  const digits = v.replace(/[\s₸тгTtenge.,]/gi, "");
  if (/^\d+$/.test(digits) && /^[\d\s]+(\s*(₸|тг|тенге))?\.?$/i.test(v)) {
    return `${Number(digits).toLocaleString("ru-RU").replace(/ /g, " ")} ₸`;
  }
  return v;
}

export type TextPart = { text: string; href?: string };
/** Split text into plain parts and http(s) links, so links can be rendered clickable. */
export function linkify(text: string): TextPart[] {
  const out: TextPart[] = [];
  const re = /https?:\/\/[^\s<>"']+/gi;
  let last = 0;
  for (const m of text.matchAll(re)) {
    const url = m[0].replace(/[.,!?;:)]+$/, "");
    if (m.index! > last) out.push({ text: text.slice(last, m.index) });
    out.push({ text: url, href: url });
    last = m.index! + url.length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}
