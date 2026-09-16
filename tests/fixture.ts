import type { Snapshot, Club, ClubEvent, Member } from "../lib/types";

/**
 * TEST FIXTURE ONLY. The app itself starts empty — every club, event and member comes from users.
 */
const now = Date.now();
const DAY = 86400000;
const iso = (ms: number) => new Date(ms).toISOString();
// Next occurrence helper: days from today at a Kazakhstan (UTC+5) hour.
function at(daysFromToday: number, hourKz: number, minute = 0) {
  const d = new Date(now + daysFromToday * DAY);
  // Build the date in UTC+5 wall time.
  const shifted = new Date(d.getTime() + 5 * 3600000);
  const utc = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate(), hourKz - 5, minute);
  return new Date(utc).toISOString();
}

export const seedClubs: Club[] = [
  {
    id: "club-run", slug: "run", city: "shymkent", name: "Шымкент Бег и Прогулки", category: "Бег / ходьба", emoji: "🏃",
    description: "Бегаем и гуляем вместе каждую неделю. Любой уровень: можно идти пешком, можно бежать 5 км. Новичков встречаем и знакомим с группой.",
    organizer_name: "Организатор клуба", organizer_bio: "Основатель клуба. Бегает несколько лет, ведёт Instagram о спорте.",
    instagram: null, chat_link: "https://chat.whatsapp.com/", meeting_point: "Дендропарк, центральный вход",
    schedule_text: "Каждую субботу в 08:00 и среду в 19:30", color: "#F97316", is_founding: true, hidden: false, created_at: iso(now - 30 * DAY),
  },
  {
    id: "club-english", slug: "english", city: "shymkent", name: "English Speaking Club", category: "Английский", emoji: "🗣️",
    description: "Живая практика английского без учебников: темы, игры, дебаты. Уровень от Pre-Intermediate. Ведущий — преподаватель с IELTS 7.5.",
    organizer_name: "Нурканат", organizer_bio: "Преподаватель английского, IELTS 7.5.",
    instagram: null, chat_link: "https://chat.whatsapp.com/", meeting_point: "Кофейня в центре (уточняется в чате)",
    schedule_text: "Каждый четверг в 19:00", color: "#2563EB", is_founding: true, hidden: false, created_at: iso(now - 30 * DAY),
  },
  {
    id: "club-chess", slug: "chess", city: "shymkent", name: "Шахматы в кофейне", category: "Шахматы", emoji: "♟️",
    description: "Быстрые партии, разбор интересных позиций и дружеский турнир раз в месяц. Доски есть, приходите с друзьями.",
    organizer_name: "Организатор клуба", organizer_bio: "Шахматист, проводит турниры для любителей.",
    instagram: null, chat_link: null, meeting_point: "Антикафе (уточняется в чате)",
    schedule_text: "Каждое воскресенье в 16:00", color: "#0F766E", is_founding: true, hidden: false, created_at: iso(now - 30 * DAY),
  },
  {
    id: "club-tennis", slug: "table-tennis", city: "shymkent", name: "Настольный теннис: любители", category: "Настольный теннис", emoji: "🏓",
    description: "Игры на вылет и мини-турниры для любителей. Ракетки можно взять на месте. Оплата стола делится между участниками.",
    organizer_name: "Организатор клуба", organizer_bio: "Тренер по настольному теннису.",
    instagram: null, chat_link: null, meeting_point: "Теннисный зал (адрес в чате)",
    schedule_text: "Вторник и пятница в 20:00", color: "#DB2777", is_founding: true, hidden: false, created_at: iso(now - 30 * DAY),
  },
  {
    id: "club-hike", slug: "hiking", city: "shymkent", name: "Горы рядом: походы", category: "Походы", emoji: "⛰️",
    description: "Однодневные выезды в горы и каньоны вокруг Шымкента. Маршруты для новичков, трансфер организуем вместе.",
    organizer_name: "Организатор клуба", organizer_bio: "Гид, водит группы по югу Казахстана.",
    instagram: null, chat_link: null, meeting_point: "Сбор у ТРЦ (уточняется)",
    schedule_text: "Раз в две недели по воскресеньям", color: "#65A30D", is_founding: true, hidden: false, created_at: iso(now - 30 * DAY),
  },
];

let n = 0;
const ev = (club_id: string, title: string, starts_at: string, extra: Partial<ClubEvent> = {}): ClubEvent => ({
  id: `ev-${++n}`, club_id, title, description: "", starts_at, duration_min: 90,
  location_name: seedClubs.find((c) => c.id === club_id)!.meeting_point, location_url: null,
  capacity: null, price_text: null, status: "scheduled", created_at: iso(now - 20 * DAY), ...extra,
});

export const seedEvents: ClubEvent[] = [
  // past
  ev("club-run", "Субботний забег 5 км", at(-14, 8)),
  ev("club-run", "Субботний забег 5 км", at(-7, 8)),
  ev("club-english", "Topic night: Travel", at(-9, 19)),
  ev("club-english", "Debate: AI at school", at(-2, 19)),
  ev("club-chess", "Воскресный блиц", at(-8, 16)),
  ev("club-tennis", "Игры на вылет", at(-5, 20), { capacity: 12, price_text: "1 000 ₸ за стол" }),
  // upcoming
  ev("club-run", "Субботний забег 5 км", at(3, 8), { description: "Разминка 10 минут, потом 5 км в спокойном темпе. Можно идти пешком." }),
  ev("club-run", "Вечерняя прогулка", at(1, 19, 30), { duration_min: 60 }),
  ev("club-english", "Topic night: Money & Dreams", at(2, 19), { capacity: 15, description: "Говорим о деньгах и целях. Будут карточки со словами." }),
  ev("club-chess", "Воскресный блиц", at(4, 16), { capacity: 20 }),
  ev("club-tennis", "Мини-турнир для новичков", at(5, 20), { capacity: 12, price_text: "1 000 ₸ за стол" }),
  ev("club-hike", "Каньон Аксу: поход для новичков", at(11, 7), { duration_min: 600, capacity: 18, price_text: "Трансфер ~5 000 ₸", description: "Лёгкий маршрут. Взять воду, удобную обувь, перекус." }),
];

const names = ["Айгерим", "Данияр", "Мадина", "Ерлан", "Алина", "Санжар", "Дана", "Тимур", "Жанна", "Арман", "Камила", "Бекзат"];
export const seedMembers: Member[] = names.map((name, i) => ({
  id: `m-${i + 1}`, name, phone: `+7700000${String(1000 + i).padStart(4, "0")}`, created_at: iso(now - (25 - i) * DAY),
}));

export function buildSeed(): Snapshot {
  const memberships: Snapshot["memberships"] = [];
  const rsvps: Snapshot["rsvps"] = [];
  const add = (club: string, ms: number[]) =>
    ms.forEach((i) => memberships.push({ club_id: club, member_id: `m-${i}`, source: "instagram", created_at: iso(now - 20 * DAY) }));
  add("club-run", [1, 2, 3, 4, 5, 6, 7]);
  add("club-english", [1, 3, 8, 9, 10]);
  add("club-chess", [2, 4, 11]);
  add("club-tennis", [5, 6, 12]);
  add("club-hike", [1, 7]);

  const r = (ev: string, m: number, attended: boolean | null) =>
    rsvps.push({ event_id: ev, member_id: `m-${m}`, status: "going", attended, created_at: iso(now - 15 * DAY) });
  // ev-1, ev-2 run; ev-3, ev-4 english; ev-5 chess; ev-6 tennis
  [1, 2, 3, 4, 5].forEach((m, i) => r("ev-1", m, i < 4));
  [1, 2, 3, 6, 7].forEach((m, i) => r("ev-2", m, i !== 4));
  [1, 3, 8, 9].forEach((m) => r("ev-3", m, true));
  [1, 8, 10].forEach((m, i) => r("ev-4", m, i < 2));
  [2, 4, 11].forEach((m, i) => r("ev-5", m, i < 2));
  [5, 6, 12].forEach((m) => r("ev-6", m, null)); // attendance not marked yet
  [1, 2, 4].forEach((m) => r("ev-7", m, null));
  [3, 8, 9, 10].forEach((m) => r("ev-9", m, null));

  return {
    clubs: structuredClone(seedClubs),
    events: structuredClone(seedEvents),
    members: structuredClone(seedMembers),
    memberships,
    rsvps,
    feedback: [
      { event_id: "ev-1", member_id: "m-1", rating: 5, comment: "Классная атмосфера", created_at: iso(now - 13 * DAY) },
      { event_id: "ev-3", member_id: "m-8", rating: 4, comment: null, created_at: iso(now - 8 * DAY) },
    ],
    logs: [],
  };
}
