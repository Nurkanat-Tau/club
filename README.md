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

- create, edit and cancel events
- see who's coming and send each person a WhatsApp reminder in one tap
- mark who actually came
- see their members and edit the club page

**Members** browse the city page, join a club and tap "Я приду" on events. The first time, they enter a name, their WhatsApp number and a 4–6 digit PIN they choose. After that:

- The same device remembers them.
- On any other phone or computer, they open "Мои встречи" and sign in with their number and PIN, and see the same clubs and events.
- After 5 wrong PINs, sign-in for that number is locked for 15 minutes.

They can also rate past events.

**Admins** (emails listed in `ADMIN_EMAILS`) sign up by creating a club like anyone else. Then `/admin` shows the experiment dashboard and lets them hide spam clubs.

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
   - Remove `ALLOW_DEMO` if it's set.
4. **Redeploy** (Deployments → ⋯ → Redeploy).

The app creates its own tables on the first request. There's no SQL to run by hand. Then open `/new-club` and create your club with your admin email, and `/admin` will work.

Every push to `main` redeploys automatically.

## 3. Everyday tasks

| Task | Where |
|---|---|
| Hide a spam or inactive club | `/admin` → "Скрыть" |
| Look at or export raw data | Vercel → Storage → your database → SQL editor / Neon console |
| Delete a person's data on request | `delete from members where phone = '+77…';` (their memberships, RSVPs and ratings go too) |
| A member forgot their PIN | `update members set pin_hash = null where phone = '+77…';` Their next sign-up or sign-in sets a new PIN. |
| Reset an organizer's password | Ask them to create a new account, or update `organizers.password_hash` (scrypt format, see `lib/password.ts`) |

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
- All writes are server actions in `app/actions.ts`. Each one re-checks permissions.

```
app/
  [city]/          city page
  c/[slug]/        club page
  e/[id]/          event page (+ /ics calendar file)
  me/              my events + ratings
  new-club/        organizer sign-up: create a club
  org/             organizer dashboard (login, events, members, club)
  admin/           experiment metrics
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

- Unit tests: phone normalization, Kazakhstan time zone, validation, slugs (Russian and Kazakh), password hashing, the memory repository, metrics.
- A Postgres integration test of the full data flow on an empty database.
- An end-to-end browser run against real Postgres, starting empty:
  - creating a club (including a validation error that keeps what was typed, and a duplicate email being rejected)
  - the organizer's first event
  - a member joining (with a PIN) and signing up for an event
  - signing in on a second device: a wrong PIN and an unknown number are rejected, and the right PIN shows the same data
  - someone else's number with a wrong PIN being blocked, with lockout after 5 tries
  - the organizer seeing that member
  - restarting the server, with all data and logins still there
  - logout and login
  - a normal organizer being blocked from `/admin`
  - an admin hiding a club
