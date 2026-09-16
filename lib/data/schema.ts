/**
 * Database schema. Applied automatically (idempotent) the first time the app talks to the
 * database, so a fresh, empty Postgres needs no manual setup. Mirror of db/schema.sql.
 */
export const SCHEMA_SQL = `
create table if not exists clubs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  city text not null default 'shymkent',
  name text not null,
  category text not null,
  emoji text not null default '✨',
  color text not null default '#ea580c',
  description text not null default '',
  organizer_name text not null default '',
  organizer_bio text not null default '',
  instagram text,
  chat_link text,
  meeting_point text not null default '',
  schedule_text text not null default '',
  is_founding boolean not null default false,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  title text not null,
  description text not null default '',
  starts_at timestamptz not null,
  duration_min int not null default 90 check (duration_min between 15 and 1440),
  location_name text not null,
  location_url text,
  capacity int check (capacity is null or capacity > 0),
  price_text text,
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
  created_at timestamptz not null default now()
);
create index if not exists events_club_starts on events (club_id, starts_at);
create index if not exists events_starts on events (starts_at);

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists memberships (
  club_id uuid not null references clubs(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  source text,
  created_at timestamptz not null default now(),
  primary key (club_id, member_id)
);
create index if not exists memberships_member on memberships (member_id);

create table if not exists rsvps (
  event_id uuid not null references events(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  status text not null default 'going' check (status in ('going', 'cancelled')),
  attended boolean,
  created_at timestamptz not null default now(),
  primary key (event_id, member_id)
);
create index if not exists rsvps_member on rsvps (member_id);

create table if not exists feedback (
  event_id uuid not null references events(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  primary key (event_id, member_id)
);

create table if not exists organizers (
  email text primary key,
  name text not null default '',
  club_id uuid references clubs(id) on delete set null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists logs (
  id bigserial primary key,
  type text not null,
  visitor_id text,
  member_id uuid,
  club_id uuid,
  event_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists logs_created on logs (created_at);
`;
