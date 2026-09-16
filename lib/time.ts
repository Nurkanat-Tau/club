// Kazakhstan uses a single time zone, UTC+5, with no daylight saving (since March 2024).
export const KZ_OFFSET = "+05:00";
const OFFSET_MS = 5 * 60 * 60 * 1000;

function parts(iso: string) {
  // Shift to UTC+5 and read UTC fields -> independent of server time zone and ICU data.
  const d = new Date(new Date(iso).getTime() + OFFSET_MS);
  return {
    y: d.getUTCFullYear(),
    m: d.getUTCMonth(),
    day: d.getUTCDate(),
    wd: d.getUTCDay(),
    hh: d.getUTCHours(),
    mm: d.getUTCMinutes(),
  };
}

const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const WEEKDAYS = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
const pad = (n: number) => String(n).padStart(2, "0");

export function formatTime(iso: string) {
  const p = parts(iso);
  return `${pad(p.hh)}:${pad(p.mm)}`;
}

/** "сб, 20 сентября" */
export function formatDay(iso: string) {
  const p = parts(iso);
  return `${WEEKDAYS[p.wd]}, ${p.day} ${MONTHS[p.m]}`;
}

const MONTHS_SHORT = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

/** "Сегодня" / "Завтра" / "сб, 20 сентября" (short: "сб 20 сен") */
export function relativeDay(iso: string, now = new Date(), short = false) {
  const a = parts(iso);
  const b = parts(now.toISOString());
  const dayA = Date.UTC(a.y, a.m, a.day);
  const dayB = Date.UTC(b.y, b.m, b.day);
  const diff = Math.round((dayA - dayB) / 86400000);
  if (diff === 0) return "Сегодня";
  if (diff === 1) return "Завтра";
  return short ? `${WEEKDAYS[a.wd]} ${a.day} ${MONTHS_SHORT[a.m]}` : formatDay(iso);
}

/** Value for <input type="datetime-local"> in Kazakhstan time. */
export function toLocalInput(iso: string) {
  const p = parts(iso);
  return `${p.y}-${pad(p.m + 1)}-${pad(p.day)}T${pad(p.hh)}:${pad(p.mm)}`;
}

/** "2026-09-20T08:00" (Kazakhstan wall time) -> ISO UTC string. Null if invalid. */
export function fromLocalInput(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value || "")) return null;
  const d = new Date(`${value}:00${KZ_OFFSET}`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/** ICS date format: 20260920T030000Z */
export function toIcsDate(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** True if the event started more than `graceMin` minutes ago. */
export function isPast(iso: string, graceMin = 0) {
  return new Date(iso).getTime() < Date.now() - graceMin * 60000;
}
