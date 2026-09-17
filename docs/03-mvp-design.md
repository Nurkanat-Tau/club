# Stage 3 — MVP design

## What's in, what's out, and why

The MVP only needs to answer: **do people join, attend, and come back, and do organizers keep organizing?**

| Built ✅ | Why |
|---|---|
| City → clubs → club page → events | Discovery (H1) |
| Join a club with name + WhatsApp number (no password, no PIN) | Lowest possible friction; people in KZ live in WhatsApp |
| "I'll come" RSVP, cancel, capacity limit, "who's going" (first names) | Commitment + social proof (H2) |
| Add to calendar (.ics) | Free reminder without SMS costs |
| Link to the club's WhatsApp/Telegram chat (click tracked) | Communication stays where people already are; we don't build chat |
| Organizer: create/edit/cancel events, RSVP list, one-tap WhatsApp per person, copy-ready invite & reminder text | Saves organizer time (H4) |
| Organizer: **mark attendance** | Without it we can't measure show rate or return rate at all |
| Organizer: members list (+ CSV), edit club page | Basic ownership of their community |
| **Self-service club creation** (`/new-club`), admin can hide clubs | The site starts empty; organizers bring their own communities |
| Member: "My events", rate past events (1–5 + comment) | Feedback loop |
| Admin `/admin`: experiment dashboard with the decision thresholds | Makes the continue/stop decision data-driven |
| Anonymous visitor tracking + event log | Visitors → joins conversion, weekly active |

| Deliberately NOT built ❌ | Why not yet |
|---|---|
| In-app chat, announcements feed | WhatsApp already does this better. Revisit if organizers ask twice |
| SMS / push notifications | Cost + complexity. Organizer sends WhatsApp reminders with one tap |
| SMS / WhatsApp one-time codes | Costs money per message. A PIN is enough for a free pilot |
| Payments | No proof yet that paid events matter. Test by asking (see 01 §11) |
| Native apps | PWA ("Add to Home Screen") is enough |
| Kazakh language UI | Russian first for speed. **Add Kazakh in week 2 if feedback asks for it** — easy: strings are few |
| Maps, search, filters, recommendations | 5 clubs don't need search |

## User flow (member)

```
Instagram / WhatsApp link
      │
      ▼
/shymkent ── upcoming events this week + 5 founding clubs
      │
      ├─► /c/[club] ── description, schedule, place, members count, organizer
      │        └─ "Вступить в клуб" → name + phone + consent (first time only)
      │             └─ "Перейти в чат клуба" (WhatsApp/Telegram)
      │
      └─► /e/[event] ── date, time, place, map, price, who's going
               └─ "Я приду" → (name + phone if first time) → ✅ записаны
                    ├─ Add to calendar
                    └─ "Не смогу прийти"
/me ── my upcoming events, my clubs, rate past events
```

## Organizer flow

```
/new-club (organizer signs up: club details + email + password)  ·  /org/login
   │
   ▼
/org ── stats (members, show rate, return rate) · upcoming · past ("отметьте посещение")
   ├─ + Новая встреча → form → event page with "copy invite" + "copy link"
   ├─ Event → RSVP list → WhatsApp each person with prefilled reminder → after event: ✓ / ✗
   ├─ Участники → list, times attended, CSV
   └─ Клуб → description, schedule, chat link, Instagram
```

Admin (you): `/admin` → overall signal + KPIs + per-club table → click a club to manage it like its organizer.

## Screens

1. **Home** `/` — pitch + city picker (only Шымкент active; others "скоро")
2. **City** `/shymkent` — this week's events, founding clubs, "start your club" CTA
3. **Club** `/c/[slug]`
4. **Event** `/e/[id]`
5. **My events** `/me`
6. **Privacy** `/privacy`
7. **Organizer login** `/org/login`
8. **Organizer home** `/org`
9. **New event** `/org/events/new`
10. **Manage event** `/org/events/[id]`
11. **Members** `/org/members`
12. **Club settings** `/org/club`
13. **Admin dashboard** `/admin`

## Database (Postgres) — `lib/data/schema.ts`

```
clubs ──< events ──< rsvps >── members ──< memberships >── clubs
                  └──< feedback >── members
organizers (email → club_id; null = admin)
logs (type, visitor_id, member_id, club_id, event_id, created_at)
```

- `members.phone` is unique and normalized to `+77XXXXXXXXX` → the same person on a new phone is recognised.
- `rsvps.attended` is `null` until the organizer marks it → metrics only count marked events.
- `logs` has no foreign keys so analytics can never break a signup.

## Authentication

- **Members:** name + phone, nothing else (decision 2026-09-17: simplicity over security for a free pilot). A signed, httpOnly cookie remembers the device for a year. On another device they type their phone on `/me`. Anyone who knows a number could see that person's clubs and sign-ups — acceptable while nothing sensitive or paid is stored.
  - *Next step if clubs become paid:* WhatsApp/SMS one-time codes.
- **Organizers & admin:** sign up themselves on `/new-club` (email + password, scrypt-hashed in our own table). After login we set our own signed cookie (30 days); every request re-checks the `organizers` table, so removing a row revokes access immediately.
- **Admins:** organizer accounts whose email is in `ADMIN_EMAILS` (automatic). The owner must register that email right after the first deploy so nobody else can.

## Technology stack

| Layer | Choice | Why |
|---|---|---|
| App | **Next.js 16** (App Router, Server Components, Server Actions), TypeScript | One codebase for pages + backend; forms work without JavaScript; huge ecosystem |
| Styling | Tailwind CSS 4 | Fast iteration, mobile-first |
| Database | **Postgres** (Neon via Vercel Storage) | Free tier, one click from Vercel, schema applied automatically |
| Hosting | **Vercel** | Free tier, deploy on every git push, HTTPS |
| Validation | Zod | All form input checked on the server |
| Tests | Vitest (unit) + Playwright script (end-to-end, run locally by me) | |
| PWA | Web manifest + icon | "Add to Home Screen" |

## Architecture

```
Browser (mobile)
   │  HTML + server actions (POST)
   ▼
Next.js on Vercel ── proxy.ts: anonymous visitor cookie
   │  lib/session.ts   signed cookies (member / organizer)
   │  lib/validation   zod
   │  lib/data/        Repo interface
   │     ├─ memory.ts    demo mode (no DB)   ← `npm run dev` works instantly
   │     └─ postgres.ts  production (auto-creates tables)
   ▼
Postgres (Neon, connected through Vercel Storage)
```

Everything goes through the server. The browser never talks to the database, and the connection string never leaves the server.

## Deployment

See `README.md` → "Put it online". Summary: import the repo into Vercel → Storage → create a Neon Postgres database → set `SESSION_SECRET` and `ADMIN_EMAILS` → redeploy. Tables are created automatically.

Cost at pilot scale: **₸0** (Neon free + Vercel hobby). A custom domain is optional (~$10–15/year).

## Analytics

Logged automatically: `view_city`, `view_club`, `view_event`, `join_club`, `rsvp`, `cancel_rsvp`, `mark_attendance`, `feedback`, `click_chat`, `create_event`.

`/admin` computes: active clubs, members (+7d), events held/upcoming, show rate, return rate, activation, unique visitors (7d), active members (7d), visitor→join conversion, average rating, members in 2+ clubs, per-club breakdown, and an automatic **signal** (early / continue / watch / change / stop) using the thresholds in `01-validation.md`.

Anything else (e.g. "how did you hear about us?") → ask in person and write it down.

## Security basics (implemented)

- All mutations are server actions that **re-check authorization** (organizer can only touch their own club; admin can touch all).
- Signed httpOnly `SameSite=Lax` cookies, `Secure` in production; `SESSION_SECRET` required in production.
- Database access is server-only (`server-only` import guard); organizer passwords are scrypt-hashed; club creation is rate-limited and has a honeypot; admins can hide clubs.
- Server-side validation (zod): phone format, lengths, URLs must be `http(s)` (blocks `javascript:` links).
- Rate limits stored in the database (work across servers): organizer login 8 / 15 min per email, member sign-in 30 / 15 min per IP, new profiles 15 / hour, new clubs 10 / hour.
- Seat booking is atomic (`select … for update`), so two people can't take the last place.
- Deleting anything (event, club, all clubs, own profile) takes two taps: the button, then «Да, …».
- Honeypot field against simple bots.
- Phone numbers visible only to that club's organizer; other members see first names only.
- Consent checkbox + privacy page (Law of RK on personal data — **have the text reviewed before a wide launch**).
- Production refuses to run in demo mode unless `ALLOW_DEMO=1`, so real people never type phones into a demo.

Not yet (add before scaling): phone OTP (SMS/WhatsApp codes, paid), audit log for organizer actions, backups policy (check the free tier's backup window), legal review of the personal-data text and where data is stored (the RK law expects Kazakh citizens' data to be kept in Kazakhstan).
