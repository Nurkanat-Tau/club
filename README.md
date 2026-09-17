# Club: real-world communities in your city

A mobile-first web app for testing one idea: **people in Shymkent will join, attend, and keep coming back to local clubs, and organizers will use a simple tool to run them.**

Pilot: **Shymkent, 5 founding clubs, 4 weeks.**

| Read first | |
|---|---|
| [`docs/01-validation.md`](docs/01-validation.md) | Problem, hypotheses, risks, 5-club strategy, 7-day plan, metrics and continue/stop thresholds |
| [`docs/02-founders.md`](docs/02-founders.md) | Where and how to find the 4 other organizers in Shymkent |
| [`docs/03-mvp-design.md`](docs/03-mvp-design.md) | What was built and why, flows, database, security |
| [`docs/04-launch.md`](docs/04-launch.md) | Organizer onboarding, pitch, Instagram launch, feedback, weekly scorecard |

---

## What the app does

The site starts **empty**. Everything on it comes from users and is saved in the database.

**Organizers** open `/new-club` and fill in 4 things about the club (name, category, when, where) plus an email and password (6+ characters). Description, chat link, Instagram and organizer info are optional and can be added later. After that they can:

- create, edit, copy, cancel and delete events; repeat an event weekly for up to 12 weeks
- copy ready-made WhatsApp texts: invitation, reminder, "time changed", "cancelled"
- see who's coming and send each person a WhatsApp reminder in one tap
- mark who actually came (or "everyone else came" in one tap), add walk-ins
- see their members (+ CSV for Excel) and ratings/comments from members
- edit everything on the club page; the club's link stays the same
- change their password in "Аккаунт"
- delete their club with two taps («Удалить клуб» → «Да, удалить клуб»). The account stays, so they can create a new club.

**Members** browse the city page and tap "Вступить" or "Я приду". The first time they type their **name and WhatsApp number** — that's it. After that:

- The same device remembers them.
- On another phone they tap "Войти" and type their number (or just use the same number in any join form).
- They can rate past events, leave a club, and delete their whole profile with two taps ("Мои встречи" → «Удалить мой профиль»).

There are no PINs or SMS codes. Trade-off: someone who knows a member's number could see which clubs they joined. For a free pilot with no payments this is acceptable; add WhatsApp/SMS codes before anything sensitive is stored.

**Admins** are organizer accounts whose email is in `ADMIN_EMAILS`. They sign up by creating a club like anyone else and then see `/admin`:

- hide or show any club (hidden clubs return "not found" to the public)
- edit or delete any club ("Изменить / удалить")
- see all organizer accounts and give an organizer a temporary password
- delete **all** clubs at once (two taps)

Member profiles and organizer accounts are kept when clubs are deleted. **Register your admin email right after the first deploy**, so nobody else can take it.

---

## 1. Run it on your computer

You need **Node.js 20.9 or newer**.

```bash
git clone https://github.com/Nurkanat-Tau/club.git
cd club
npm install
npm run dev
```

Open http://localhost:3000. Without a database the data lives in memory and resets when you stop the server. To keep it, put a Postgres connection string in `.env.local` as `DATABASE_URL=...`.

---

## 2. Put it online (Vercel + Postgres)

1. Import the GitHub repo into Vercel.
2. Add a database: open the Vercel project, go to **Storage → Create Database**, pick **Neon (Postgres)** on the free plan, and connect it to the project. Vercel adds `DATABASE_URL` automatically.
3. In **Settings → Environment Variables**, set:
   - `SESSION_SECRET`: 32+ random characters
   - `ADMIN_EMAILS`: your email
   - `NEXT_PUBLIC_SITE_URL`: the site's address, e.g. `https://club-rho-six.vercel.app`
   - optional `NEXT_PUBLIC_CONTACT_WHATSAPP`: your number, shown as "Связаться" in the footer
   - Remove `ALLOW_DEMO` if it's set.
4. **Redeploy** (Deployments → ⋯ → Redeploy).

The app creates its own tables on the first request. There's no SQL to run by hand. Then open `/new-club` and create your club with your admin email; `/admin` works right away.

Every push to `main` redeploys automatically.

## 3. Everyday tasks

| Task | Where |
|---|---|
| Hide a spam or inactive club | `/admin` → "Скрыть" |
| Delete one club / all clubs | `/admin` → "Изменить / удалить" → «Удалить клуб», or «Удалить все клубы» at the bottom (each asks "Да, …?" once) |
| Look at or export raw data | Vercel → Storage → your database → SQL editor / Neon console |
| Delete a person's data on request | They can do it themselves: "Мои встречи" → «Удалить мой профиль». Or: `delete from members where phone = '+77…';` |
| An organizer forgot their password | `/admin` → "Организатор забыл пароль" → pass the temporary password personally; they change it in "Аккаунт" |

## 4. For developers

```bash
npm run dev        # dev server (demo mode if no .env.local)
npm run check      # typecheck + lint + unit tests
npm run build      # production build
```

- Copy `.env.example` to `.env.local` and set `DATABASE_URL` to run locally against Postgres.
- In production, the app **refuses to run without a database** unless `ALLOW_DEMO=1` is set. This keeps a demo deployment from collecting real people's phone numbers.
- Stack: Next.js 16 (App Router, Server Actions), TypeScript, Tailwind 4, Postgres (`pg`), Zod, Vitest. Organizer passwords are hashed with scrypt.
- Data access goes through the `Repo` interface in `lib/data/`: `memory.ts` (no database) and `postgres.ts` (production). The schema is in `lib/data/schema.ts` (copy in `db/schema.sql`) and is applied automatically.
- Postgres integration test: `TEST_DATABASE_URL=postgres://… npm test` (it wipes that database).
- Browser test of the whole flow: `tests/e2e/full-flow.e2e.mjs` (needs a build, playwright and a throwaway Postgres).
- All writes are server actions in `app/actions.ts`. Each one re-checks permissions.

```
app/
  [city]/          city page
  c/[slug]/        club page
  e/[id]/          event page (+ /ics calendar file)
  me/              my events, sign-in on a new device, ratings
  new-club/        organizer sign-up: create a club
  org/             organizer dashboard (login, events, members, feedback, club, account)
  admin/           experiment metrics, organizers, password reset
  robots.ts, sitemap.ts, opengraph images for link previews
  go/chat/[slug]/  tracked redirect to the club chat
  actions.ts       all server actions
components/        UI
lib/
  data/            memory + Postgres repositories, schema
  metrics.ts       experiment metrics + decision rules
  session.ts       signed cookies (member, organizer)
  validation.ts    zod schemas
db/                schema.sql (reference)
docs/              strategy
tests/             unit tests
```

### What was tested

- Unit tests (memory repo + the same contract against real Postgres): phone numbers (Kazakhstan and international, landlines rejected), Kazakhstan time, Russian validation messages, prices, Instagram links, plurals, slugs, passwords, metrics, atomic seat booking under a race, rate limits, leaving a club, deleting a member, feedback list.
- A 24-step browser run against real Postgres, starting empty: short club sign-up (optional fields collapsed, errors keep input), past-dated events rejected, member join with name + phone, sign-in on another device with just the phone, same phone = same person, cancel and delete events in two taps, robots/sitemap/link-preview images, server restart with data and sessions intact, automatic admin, hiding a club (public gets 404), organizer editing and deleting their club, admin password reset, member deleting their profile, deleting one or all clubs. No browser errors.
