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

**Organizers** open `/new-club` and create a club: name, category, description, schedule, place, chat link, plus their email and a password. After that they can:

- create, edit, copy, cancel and delete events; repeat an event weekly for up to 12 weeks
- copy ready-made WhatsApp texts: invitation, reminder, "time changed", "cancelled"
- see who's coming and send each person a WhatsApp reminder in one tap
- mark who actually came (or "everyone else came" in one tap), add walk-ins
- see their members (+ CSV for Excel) and ratings/comments from members
- change their password in "Аккаунт"
- edit everything on the club page (name, category, description, schedule, place, chat, Instagram, organizer info); the club's link stays the same
- delete their club (they type the club name to confirm). Its events, sign-ups and member list are deleted for good. Their account stays, so they can create a new club.

**Members** browse the city page, join a club and tap "Я приду" on events. The first time, they enter a name, their WhatsApp number and a 4–6 digit PIN they choose. After that:

- The same device remembers them.
- On any other phone or computer, they open "Мои встречи" and sign in with their number and PIN, and see the same clubs and events.
- After 5 wrong PINs, sign-in for that number is locked for 15 minutes.

They can also rate past events, leave a club, change their PIN, and delete their profile ("Удалить мои данные").

**Admins.** Being in `ADMIN_EMAILS` is not enough on its own (anyone could register that email first). An admin:

1. signs up by creating a club with an email listed in `ADMIN_EMAILS`;
2. opens **Кабинет → Аккаунт → «Активировать права администратора»** (`/admin/claim`) and enters the secret `ADMIN_SETUP_CODE` once.

Then `/admin` shows the experiment dashboard and lets them:

- hide or show any club (hidden clubs return "not found" to the public)
- edit or delete any club ("Изменить / удалить")
- see all organizer accounts
- give an organizer a temporary password, or a member a new PIN
- delete **all** clubs at once (type «УДАЛИТЬ ВСЁ» to confirm)

Member profiles and organizer accounts are kept.

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
   - `ADMIN_SETUP_CODE`: a secret of 12+ characters (you type it once at `/admin/claim`)
   - `NEXT_PUBLIC_SITE_URL`: the site's address, e.g. `https://club-rho-six.vercel.app`
   - optional `NEXT_PUBLIC_CONTACT_WHATSAPP`: your number, shown as "Связаться" in the footer
   - Remove `ALLOW_DEMO` if it's set.
4. **Redeploy** (Deployments → ⋯ → Redeploy).

The app creates its own tables on the first request. There's no SQL to run by hand. Then open `/new-club`, create your club with your admin email, and activate admin rights at `/admin/claim`.

Every push to `main` redeploys automatically.

## 3. Everyday tasks

| Task | Where |
|---|---|
| Hide a spam or inactive club | `/admin` → "Скрыть" |
| Delete one club / all clubs | `/admin` → "Изменить / удалить", or "Удалить все клубы" at the bottom |
| Look at or export raw data | Vercel → Storage → your database → SQL editor / Neon console |
| Delete a person's data on request | They can do it themselves on "Мои встречи" → "Удалить мои данные". Or: `delete from members where phone = '+77…';` |
| A member forgot their PIN | `/admin` → "Участник забыл PIN" → pass the new PIN to them personally |
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
  admin/           experiment metrics, organizers, resets; admin/claim
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

- Unit tests (memory repo + the same contract against real Postgres): phone numbers (Kazakhstan and international, landlines rejected), Kazakhstan time, Russian validation messages, prices, Instagram links, plurals, slugs, passwords, metrics, atomic seat booking under a race, rate limits, admin flag, leaving a club, feedback list.
- A 26-step browser run against real Postgres, starting empty: creating a club (errors keep what was typed; duplicate email rejected), past-dated events rejected, member join + RSVP, second-device sign-in (generic error for wrong PIN/unknown number), impersonation lockout, cancel-with-confirmation, robots/sitemap/link-preview images, server restart with data and sessions intact, admin rights only with the setup code (and only for listed emails), hiding a club (public gets 404), organizer editing and deleting their club, admin password/PIN resets, deleting one or all clubs. No browser errors.
