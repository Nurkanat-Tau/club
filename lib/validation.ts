import { z } from "zod";
import { normalizePhone } from "./phone";
import { normalizeInstagram, normalizePrice } from "./text";

// Russian default messages for anything without a custom one.
z.config(z.locales.ru());
import { fromLocalInput } from "./time";
import { getCategory } from "./categories";

/** Trimmed string with a Russian "too long" message. */
const str = (max: number) => z.string().trim().max(max, `Слишком длинно: максимум ${max} символов`);
const optionalUrl = z
  .string()
  .trim()
  .max(500, "Ссылка слишком длинная")
  .transform((v) => (v === "" ? null : v))
  .refine((v) => v === null || /^https?:\/\//i.test(v), "Ссылка должна начинаться с http:// или https://");

export const LIMITS = {
  memberName: 60, clubName: 60, clubDescription: 2000, schedule: 200, place: 200, organizerName: 80, organizerBio: 500,
  eventTitle: 100, eventDescription: 2000, price: 60, comment: 1000, password: 200,
} as const;

const phone = z
  .string()
  .transform((v) => normalizePhone(v))
  .refine((v): v is string => v !== null, "Проверьте номер: +7 701 123 45 67 (другие страны — с «+», например +998…)");
/** Join / sign-up form. Name is only required for new people (checked in the action). */
export const memberSchema = z.object({
  name: str(LIMITS.memberName),
  phone,
});

export const memberLoginSchema = z.object({ phone });

export const eventSchema = z.object({
  title: str(LIMITS.eventTitle).min(3, "Название — минимум 3 символа"),
  description: str(LIMITS.eventDescription).default(""),
  starts_at: z
    .string()
    .transform((v) => fromLocalInput(v))
    .refine((v): v is string => v !== null, "Укажите дату и время"),
  duration_min: z.coerce.number({ message: "Укажите длительность" }).int("Целое число минут").min(15, "Минимум 15 минут").max(24 * 60, "Максимум 24 часа"),
  location_name: str(LIMITS.place).min(2, "Укажите место"),
  location_url: optionalUrl,
  capacity: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .refine((v) => v === null || (Number.isInteger(v) && v > 0 && v <= 10000), "Лимит — целое число больше 0"),
  price_text: str(LIMITS.price).transform((v) => normalizePrice(v)),
});


export const clubSchema = z.object({
  name: str(LIMITS.clubName).min(3, "Название — минимум 3 символа"),
  category: z.string().refine((v) => !!getCategory(v), "Выберите категорию"),
  description: str(LIMITS.clubDescription).default(""),
  schedule_text: str(LIMITS.schedule).min(2, "Укажите, когда проходят встречи"),
  meeting_point: str(LIMITS.place).min(2, "Укажите место встречи"),
  chat_link: optionalUrl,
  instagram: z
    .string()
    .trim()
    .max(200, "Слишком длинно")
    .refine((v) => v === "" || normalizeInstagram(v) !== null, "Укажите ник, например shymkent.run, или ссылку на профиль")
    .transform((v) => normalizeInstagram(v)),
  organizer_name: str(LIMITS.organizerName).default(""),
  organizer_bio: str(LIMITS.organizerBio).default(""),
});

export const accountSchema = z.object({
  email: z.string().trim().toLowerCase().max(200).email("Введите корректный email"),
  password: z.string().min(6, "Пароль — минимум 6 символов").max(LIMITS.password, "Пароль слишком длинный"),
});

export const newClubSchema = clubSchema.extend(accountSchema.shape);

export const feedbackSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: str(LIMITS.comment).transform((v) => (v === "" ? null : v)),
});

export type FormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
  /** Submitted values, so the form can be refilled after React resets it. */
  values?: Record<string, string>;
} | null;

export function formErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const k = String(issue.path[0] ?? "form");
    if (!out[k]) out[k] = issue.message;
  }
  return out;
}

export function pick(fd: FormData, keys: string[]) {
  return Object.fromEntries(keys.map((k) => [k, (fd.get(k) as string | null) ?? ""]));
}

export const passwordChangeSchema = z.object({
  current: z.string().min(1, "Введите текущий пароль"),
  next: accountSchema.shape.password,
});

export const walkInSchema = z.object({
  name: str(LIMITS.memberName).min(2, "Введите имя"),
  phone,
});
