import { describe, expect, it } from "vitest";
import { plural, normalizeInstagram, normalizePrice, linkify } from "../lib/text";
import { normalizePhone, formatPhoneInput } from "../lib/phone";
import { memberSchema, eventSchema, clubSchema } from "../lib/validation";

describe("text helpers", () => {
  it("pluralizes Russian", () => {
    const f: [string, string, string] = ["участник", "участника", "участников"];
    expect(plural(1, f)).toBe("участник");
    expect(plural(3, f)).toBe("участника");
    expect(plural(5, f)).toBe("участников");
    expect(plural(11, f)).toBe("участников");
    expect(plural(21, f)).toBe("участник");
    expect(plural(112, f)).toBe("участников");
  });
  it("normalizes Instagram handles and links", () => {
    expect(normalizeInstagram("@shymkent.run")).toBe("shymkent.run");
    expect(normalizeInstagram("https://www.instagram.com/shymkent.run/?igsh=abc")).toBe("shymkent.run");
    expect(normalizeInstagram("instagram.com/club_1")).toBe("club_1");
    expect(normalizeInstagram("bad handle!")).toBeNull();
  });
  it("normalizes prices", () => {
    expect(normalizePrice("2000")).toBe("2 000 ₸");
    expect(normalizePrice("")).toBeNull();
    expect(normalizePrice("0")).toBeNull();
    expect(normalizePrice("Бесплатно")).toBeNull();
    expect(normalizePrice("1500 тг за вход")).toBe("1500 тг за вход");
  });
  it("finds links in text", () => {
    const parts = linkify("Чат: https://t.me/club. Ждём!");
    const link = parts.find((p) => p.href);
    expect(link?.href).toBe("https://t.me/club");
    expect(parts.map((p) => p.text).join("")).toBe("Чат: https://t.me/club. Ждём!");
  });
});

describe("international phones", () => {
  it("accepts + and 00 prefixes, rejects KZ landlines", () => {
    expect(normalizePhone("+998 90 123 45 67")).toBe("+998901234567");
    expect(normalizePhone("00998901234567")).toBe("+998901234567");
    expect(normalizePhone("+7 7252 12 34 56")).toBeNull();
    expect(normalizePhone("8 701 123 45 67")).toBe("+77011234567");
  });
  it("formats while typing", () => {
    expect(formatPhoneInput("87011234567")).toMatch(/701 123 45 67$/);
  });
});

describe("validation (Russian messages)", () => {
  it("speaks Russian for generic errors", () => {
    const r = memberSchema.safeParse({ phone: 5 });
    expect(r.success).toBe(false);
    if (!r.success) for (const i of r.error.issues) expect(i.message).toMatch(/[а-яА-Я]/);
  });
  it("normalizes event price and club instagram", () => {
    const e = eventSchema.safeParse({ title: "Пробежка", description: "", starts_at: "2030-01-01T08:00", duration_min: "60", location_name: "Парк", location_url: "", capacity: "", price_text: "1000" });
    expect(e.success && e.data.price_text).toBe("1 000 ₸");
    const c = clubSchema.safeParse({ name: "Бег", category: "running", description: "Бегаем вместе по субботам", schedule_text: "Сб 8:00", meeting_point: "Парк", chat_link: "", instagram: "@run.shym", organizer_name: "Нурканат", organizer_bio: "" });
    if (c.success) expect(c.data.instagram).toBe("run.shym");
    else throw new Error(JSON.stringify(c.error.issues));
  });
});
