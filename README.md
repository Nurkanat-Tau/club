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

**For members** (no password, just name and WhatsApp number):

- Pick a city, then see this week's events and the founding clubs.
- Join a club, then go to the club's WhatsApp or Telegram chat.
- Tap "Я приду" on an event, add it to the calendar, or cancel.
- See "My events" and rate past events.

**For organizers** (email and password):

- Create, edit and cancel events.
- See who's coming, and send each person a WhatsApp reminder with one tap.
- Copy a ready-made invite text.
- Mark who actually came.
- See the members list and edit the club page.

**For you (admin):** `/admin` shows the experiment dashboard: show rate, return rate, active clubs, members in 2+ clubs, ratings, and an automatic continue / change / stop signal.

---

## 1. Run it on your computer (5 minutes, no database needed)

You need **Node.js 20.9 or newer**. Download the LTS version from https://nodejs.org.

```bash
git clone https://github.com/<your-username>/club.git
cd club
npm install
npm run dev
```

Open http://localhost:3000. The app runs in **demo mode**: fake data that resets on every restart.

Demo logins at http://localhost:3000/org/login (password `demo` for all):

| Email | Role |
|---|---|
| `run@club.kz`, `english@club.kz`, `chess@club.kz`, `tennis@club.kz`, `hike@club.kz` | Organizer of that club |
| `admin@club.kz` | Admin (`/admin`) |

To see it as a phone: in Chrome press F12, then click the phone icon.

---

## 2. Put it online for real (about 45 minutes, free)

### Step 1: Create the database (Supabase)

1. Go to https://supabase.com, sign up, and click **New project**.
   - Name: `club`. Region: the closest one offered (for example Frankfurt). Save the database password somewhere safe.
2. When the project is ready, open **SQL Editor** → **New query**.
3. Open [`supabase/schema.sql`](supabase/schema.sql) in this repo, copy all of it, paste it in, and click **Run**. You should see "Success".
4. Do the same with [`supabase/seed.sql`](supabase/seed.sql). This creates the 5 founding clubs with placeholder text.
5. Go to **Project Settings → API** (in newer dashboards it's called **API Keys**) and copy:
   - the **Project URL** (it looks like `https://abcd.supabase.co`)
   - the **service_role** or **secret** key. ⚠️ This key is a master password: never share it or paste it into public places.

### Step 2: Create organizer accounts

For each organizer, and for yourself:

1. In Supabase, go to **Authentication → Users → Add user → Create new user**. Enter their email and a password, and tick **Auto Confirm User**.
2. In the **SQL Editor**, run the matching line:

```sql
-- organizer of the running club
insert into organizers (email, club_id) select 'brother@example.com', id from clubs where slug = 'run';
-- you as admin (club_id = null)
insert into organizers (email, club_id) values ('you@example.com', null);
-- you as organizer of the English club: use a second email, e.g. you+english@gmail.com
insert into organizers (email, club_id) select 'you+english@gmail.com', id from clubs where slug = 'english';
```

Club slugs: `run`, `english`, `chess`, `table-tennis`, `hiking`. To rename a club or replace hiking with something else, edit it in **Table Editor → clubs** (name, slug, emoji, category, color).

### Step 3: Deploy (Vercel)

1. Go to https://vercel.com and sign up **with your GitHub account**.
2. Click **Add New… → Project**, pick the `club` repository, and click **Import**.
3. Open **Environment Variables** and add:

| Name | Value |
|---|---|
| `SUPABASE_URL` | your Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | your service_role / secret key |
| `SESSION_SECRET` | any random text of 32+ characters. You can generate one at https://generate-secret.vercel.app/32 |
| `ADMIN_EMAILS` | your admin email |
| `NEXT_PUBLIC_CONTACT_WHATSAPP` | *(optional)* your number, e.g. `+77011234567` |

4. Click **Deploy**. After about a minute you get a link like `https://club-xxxx.vercel.app`.
5. Open `/org/login`, log in with your admin email, and check that `/admin` loads.

From now on, **every push to GitHub redeploys automatically.**

### Step 4: Before sharing the link

- [ ] Log in as each organizer and fill in the club page: description, schedule, place, and chat link.
- [ ] Each organizer creates their first event.
- [ ] Join a club and RSVP from your own phone to check the whole flow.
- [ ] On the phone, use **Share → Add to Home Screen**. It installs like an app.
- [ ] Optional: connect your own domain in Vercel → Settings → Domains.

---

## 3. Everyday tasks

| Task | Where |
|---|---|
| Add or remove an organizer | Supabase → Authentication (user) + `organizers` table |
| Fix a typo in someone's name or phone | Supabase → Table Editor → `members` |
| Delete a person's data on request | Table Editor → `members` → delete the row (their memberships, RSVPs and ratings are deleted too) |
| Export data | Table Editor → any table → **Export to CSV** |
| See raw analytics | Table Editor → `logs` |

---

## 4. For developers

```bash
npm run dev        # dev server (demo mode if no .env.local)
npm run check      # typecheck + lint + unit tests
npm run build      # production build
```

- Copy `.env.example` to `.env.local` to run locally against Supabase.
- In production, the app **refuses to run without a database** unless `ALLOW_DEMO=1` is set. This keeps a demo deployment from collecting real people's phone numbers.
- Stack: Next.js 16 (App Router, Server Actions), TypeScript, Tailwind 4, Supabase (Postgres + Auth), Zod, Vitest.
- Data access goes through the `Repo` interface in `lib/data/`: `memory.ts` (demo) and `supabase.ts` (production).
- All writes are server actions in `app/actions.ts`. Each one re-checks permissions.

```
app/
  [city]/          city page
  c/[slug]/        club page
  e/[id]/          event page (+ /ics calendar file)
  me/              my events + ratings
  org/             organizer dashboard (login, events, members, club)
  admin/           experiment metrics
  go/chat/[slug]/  tracked redirect to the club chat
  actions.ts       all server actions
components/        UI
lib/
  data/            memory + Supabase repositories, demo seed
  metrics.ts       experiment metrics + decision rules
  session.ts       signed cookies (member, organizer)
  validation.ts    zod schemas
supabase/          schema.sql, seed.sql
docs/              strategy
tests/             unit tests
```

### What was tested

- Unit tests: phone normalization, Kazakhstan time zone, validation, the memory repository, metrics.
- End-to-end browser runs (Playwright) in **demo mode** and **against a real Postgres + PostgREST database**. They covered: join (including an invalid phone), RSVP, cancel, calendar file, "My events", organizer login (wrong and right password), creating an event, editing a club, marking attendance, capacity limits, organizers blocked from other clubs' events and from `/admin`, the admin dashboard, and the tracked chat redirect.
