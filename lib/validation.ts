import { z } from "zod";
import { normalizeKzPhone } from "./phone";
import { fromLocalInput } from "./time";
import { getCategory } from "./categories";

const str = (max: number) => z.string().trim().max(max);
const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .transform((v) => (v === "" ? null : v))
  .refine((v) => v === null || /^https?:\/\//i.test(v), "Ссылка должна начинаться с http:// или https://");

export const memberSchema = z.object({
  name: str(60).min(2, "Введите имя"),
  phone: z
    .string()
    .transform((v) => normalizeKzPhone(v))
    .refine((v): v is string => v !== null, "Введите казахстанский номер, например +7 701 123 45 67"),
  consent: z.literal("on", { message: "Нужно согласие на обработку данных" }),
  pin: z.string().trim().regex(/^\d{4,6}$/, "PIN — от 4 до 6 цифр"),
});

export const memberLoginSchema = z.object({
  phone: memberSchema.shape.phone,
  pin: z.string().trim().regex(/^\d{4,6}$/, "PIN — от 4 до 6 цифр"),
});

export const eventSchema = z.object({
  title: str(100).min(3, "Название слишком короткое"),
  description: str(2000).default(""),
  starts_at: z
    .string()
    .transform((v) => fromLocalInput(v))
    .refine((v): v is string => v !== null, "Укажите дату и время"),
  duration_min: z.coerce.number().int().min(15, "Минимум 15 минут").max(24 * 60),
  location_name: str(200).min(2, "Укажите место"),
  location_url: optionalUrl,
  capacity: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .refine((v) => v === null || (Number.isInteger(v) && v > 0 && v <= 10000), "Лимит — целое число больше 0"),
  price_text: str(100).transform((v) => (v === "" ? null : v)),
});


export const clubSchema = z.object({
  name: str(60).min(3, "Название — минимум 3 символа"),
  category: z.string().refine((v) => !!getCategory(v), "Выберите категорию"),
  description: str(2000).min(20, "Опишите клуб подробнее (минимум 20 символов)"),
  schedule_text: str(200).min(2, "Укажите, когда проходят встречи"),
  meeting_point: str(200).min(2, "Укажите место встречи"),
  chat_link: optionalUrl,
  instagram: str(60).transform((v) => (v === "" ? null : v.replace(/^@/, ""))),
  organizer_name: str(80).min(2, "Укажите ваше имя"),
  organizer_bio: str(500).default(""),
});

export const accountSchema = z.object({
  email: z.string().trim().toLowerCase().max(200).email("Введите корректный email"),
  password: z.string().min(8, "Пароль — минимум 8 символов").max(200),
});

export const newClubSchema = clubSchema.extend(accountSchema.shape);

export const feedbackSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: str(1000).transform((v) => (v === "" ? null : v)),
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
