import { Pool, types, type PoolClient } from "pg";
import type { Club, ClubEvent, Member, NewClubInput, Repo, Rsvp, Snapshot } from "../types";
import { EmailTakenError } from "../types";
import { slugify } from "../slug";
import { SCHEMA_SQL } from "./schema";

// Return timestamps as ISO strings and counts as numbers.
types.setTypeParser(1184, (v) => new Date(v).toISOString()); // timestamptz
types.setTypeParser(20, (v) => Number(v)); // int8 / count(*)

const MEMBER_COLS = "id, name, phone, created_at";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (s: string) => UUID.test(s);

export function createPostgresRepo(connectionString: string): Repo {
  const local = /localhost|127\.0\.0\.1/.test(connectionString);
  const pool = new Pool({
    connectionString,
    max: 3,
    idleTimeoutMillis: 10_000,
    ssl: local || /sslmode=disable/.test(connectionString) ? undefined : { rejectUnauthorized: false },
  });

  let ready: Promise<void> | null = null;
  const migrate = () => {
    ready ??= pool.query(SCHEMA_SQL).then(() => undefined).catch((e) => {
      ready = null; // retry on next request
      throw e;
    });
    return ready;
  };

  async function q<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    await migrate();
    const res = await pool.query(sql, params);
    return res.rows as T[];
  }
  const one = async <T>(sql: string, params: unknown[] = []) => (await q<T>(sql, params))[0] ?? null;

  async function tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
    await migrate();
    const c = await pool.connect();
    try {
      await c.query("begin");
      const out = await fn(c);
      await c.query("commit");
      return out;
    } catch (e) {
      await c.query("rollback");
      throw e;
    } finally {
      c.release();
    }
  }

  async function insertClub(db: PoolClient, city: string, c: NewClubInput): Promise<Club> {
    const base = slugify(c.name);
    let slug = base;
    for (let i = 2; ; i++) {
      const r = await db.query("select 1 from clubs where slug = $1", [slug]);
      if (!r.rowCount) break;
      slug = `${base}-${i}`;
    }
    const founding = (await db.query("select count(*) as n from clubs where city = $1", [city])).rows[0].n < 5;
    return (
      await db.query(
        `insert into clubs (slug, city, name, category, emoji, color, description, organizer_name, organizer_bio,
           instagram, chat_link, meeting_point, schedule_text, is_founding)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) returning *`,
        [slug, city, c.name, c.category, c.emoji, c.color, c.description, c.organizer_name, c.organizer_bio,
          c.instagram, c.chat_link, c.meeting_point, c.schedule_text, founding],
      )
    ).rows[0] as Club;
  }

  return {
    async listClubs(city) {
      return q<Club>("select * from clubs where city = $1 and not hidden order by created_at", [city]);
    },
    async createClubWithOrganizer(city, c, email, passwordHash) {
      return tx(async (db) => {
        const taken = await db.query("select 1 from organizers where email = $1", [email]);
        if (taken.rowCount) throw new EmailTakenError();
        const club = await insertClub(db, city, c);
        await db.query("insert into organizers (email, name, club_id, password_hash) values ($1,$2,$3,$4)", [
          email, c.organizer_name, club.id, passwordHash,
        ]);
        return club;
      });
    },
    async createOrganizer(email, name, passwordHash, isAdmin) {
      const r = await q(
        "insert into organizers (email, name, club_id, password_hash, is_admin) values ($1,$2,null,$3,$4) on conflict (email) do nothing returning email",
        [email, name, passwordHash, isAdmin],
      );
      if (!r.length) throw new EmailTakenError();
    },
    async createClubForOrganizer(city, c, email) {
      return tx(async (db) => {
        const o = await db.query("select club_id from organizers where email = $1 for update", [email]);
        if (!o.rowCount || o.rows[0].club_id) return null;
        const club = await insertClub(db, city, c);
        await db.query("update organizers set club_id = $1, name = $2 where email = $3", [club.id, c.organizer_name, email]);
        return club;
      });
    },
    async deleteClub(id) {
      if (!isUuid(id)) return;
      await q("delete from clubs where id = $1", [id]); // cascades; organizers.club_id becomes null
    },
    async deleteAllClubs() {
      return (await one<{ n: number }>("with d as (delete from clubs returning 1) select count(*) as n from d"))!.n;
    },
    async setClubHidden(id, hidden) {
      await q("update clubs set hidden = $2 where id = $1", [id, hidden]);
    },
    async getClubBySlug(slug) {
      return one<Club>("select * from clubs where slug = $1", [slug]);
    },
    async getClubById(id) {
      if (!isUuid(id)) return null;
      return one<Club>("select * from clubs where id = $1", [id]);
    },
    async updateClub(id, i) {
      await q(
        `update clubs set name=$2, category=$3, emoji=$4, color=$5, description=$6, organizer_name=$7, organizer_bio=$8,
           instagram=$9, chat_link=$10, meeting_point=$11, schedule_text=$12 where id=$1`,
        [id, i.name, i.category, i.emoji, i.color, i.description, i.organizer_name, i.organizer_bio, i.instagram,
          i.chat_link, i.meeting_point, i.schedule_text],
      );
      await q("update organizers set name = $2 where club_id = $1", [id, i.organizer_name]);
    },

    async listEvents({ city, clubId, from, to, includeCancelled }) {
      const where: string[] = ["not c.hidden"];
      const params: unknown[] = [];
      const add = (cond: string, v: unknown) => {
        params.push(v);
        where.push(cond.replace("?", `$${params.length}`));
      };
      if (city) add("c.city = ?", city);
      if (clubId) {
        if (!isUuid(clubId)) return [];
        add("e.club_id = ?", clubId);
        where.shift(); // an organizer still sees their own events if the club is hidden
      }
      if (from) add("e.starts_at >= ?", from);
      if (to) add("e.starts_at < ?", to);
      if (!includeCancelled) where.push("e.status = 'scheduled'");
      return q<ClubEvent>(
        `select e.* from events e join clubs c on c.id = e.club_id where ${where.join(" and ")} order by e.starts_at`,
        params,
      );
    },
    async getEvent(id) {
      if (!isUuid(id)) return null;
      return one<ClubEvent>("select * from events where id = $1", [id]);
    },
    async createEvent(clubId, i) {
      return (await one<ClubEvent>(
        `insert into events (club_id, title, description, starts_at, duration_min, location_name, location_url, capacity, price_text)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *`,
        [clubId, i.title, i.description, i.starts_at, i.duration_min, i.location_name, i.location_url, i.capacity, i.price_text],
      ))!;
    },
    async updateEvent(id, i) {
      await q(
        `update events set title=$2, description=$3, starts_at=$4, duration_min=$5, location_name=$6, location_url=$7,
           capacity=$8, price_text=$9 where id=$1`,
        [id, i.title, i.description, i.starts_at, i.duration_min, i.location_name, i.location_url, i.capacity, i.price_text],
      );
    },
    async setEventStatus(id, status) {
      await q("update events set status = $2 where id = $1", [id, status]);
    },

    async upsertMemberByPhone(name, phone) {
      // Insert, or return the existing member with this phone (keeps their original name).
      return (await one<Member>(
        `with ins as (insert into members (name, phone) values ($1, $2) on conflict (phone) do nothing returning ${MEMBER_COLS})
         select * from ins union all select ${MEMBER_COLS} from members where phone = $2 limit 1`,
        [name, phone],
      ))!;
    },
    async getMember(id) {
      if (!isUuid(id)) return null;
      return one<Member>(`select ${MEMBER_COLS} from members where id = $1`, [id]);
    },
    async getMemberAuth(phone) {
      const r = await one<Member & { pin_hash: string | null; pin_locked_until: string | null }>(
        `select ${MEMBER_COLS}, pin_hash, pin_locked_until from members where phone = $1`,
        [phone],
      );
      if (!r) return null;
      const { pin_hash, pin_locked_until, ...member } = r;
      return { member, pin_hash, locked_until: pin_locked_until };
    },
    async deleteMember(id) {
      await q("update logs set member_id = null where member_id = $1", [id]);
      await q("delete from members where id = $1", [id]);
    },
    async createMember(name, phone, pinHash) {
      const r = await one<Member>(
        `insert into members (name, phone, pin_hash) values ($1,$2,$3)
         on conflict (phone) do nothing returning ${MEMBER_COLS}`,
        [name, phone, pinHash],
      );
      if (!r) throw new Error("phone_taken");
      return r;
    },
    async setMemberPin(id, pinHash) {
      await q("update members set pin_hash = $2, pin_failures = 0, pin_locked_until = null where id = $1", [id, pinHash]);
    },
    async recordPinFailure(id) {
      await q(
        `update members set
           pin_failures = case when pin_failures + 1 >= 5 then 0 else pin_failures + 1 end,
           pin_locked_until = case when pin_failures + 1 >= 5 then now() + interval '15 minutes' else pin_locked_until end
         where id = $1`,
        [id],
      );
    },
    async clearPinFailures(id) {
      await q("update members set pin_failures = 0, pin_locked_until = null where id = $1", [id]);
    },

    async joinClub(clubId, memberId, source) {
      await q("insert into memberships (club_id, member_id, source) values ($1,$2,$3) on conflict do nothing", [
        clubId, memberId, source,
      ]);
    },
    async isMember(clubId, memberId) {
      return !!(await one("select 1 from memberships where club_id = $1 and member_id = $2", [clubId, memberId]));
    },
    async countMembers(clubId) {
      return (await one<{ n: number }>("select count(*) as n from memberships where club_id = $1", [clubId]))!.n;
    },
    async listClubMembers(clubId) {
      return q(
        `select m.*, ms.created_at as joined_at,
           (select count(*) from rsvps r join events e on e.id = r.event_id
             where r.member_id = m.id and e.club_id = $1 and r.attended) as attended_count
         from memberships ms join members m on m.id = ms.member_id
         where ms.club_id = $1 order by ms.created_at desc`,
        [clubId],
      );
    },
    async listMemberClubs(memberId) {
      return q<Club>(
        "select c.* from memberships ms join clubs c on c.id = ms.club_id where ms.member_id = $1 and not c.hidden order by ms.created_at",
        [memberId],
      );
    },

    async setRsvp(eventId, memberId, status) {
      await q(
        `insert into rsvps (event_id, member_id, status) values ($1,$2,$3)
         on conflict (event_id, member_id) do update set status = excluded.status`,
        [eventId, memberId, status],
      );
    },
    async getRsvp(eventId, memberId) {
      return one<Rsvp>("select * from rsvps where event_id = $1 and member_id = $2", [eventId, memberId]);
    },
    async countGoing(eventIds) {
      const out: Record<string, number> = {};
      eventIds.forEach((id) => (out[id] = 0));
      const ids = eventIds.filter(isUuid);
      if (!ids.length) return out;
      const rows = await q<{ event_id: string; n: number }>(
        "select event_id, count(*) as n from rsvps where event_id = any($1::uuid[]) and status = 'going' group by event_id",
        [ids],
      );
      rows.forEach((r) => (out[r.event_id] = r.n));
      return out;
    },
    async listEventRsvps(eventId) {
      const rows = await q<Rsvp & { m_id: string; m_name: string; m_phone: string; m_created: string }>(
        `select r.*, m.id as m_id, m.name as m_name, m.phone as m_phone, m.created_at as m_created
         from rsvps r join members m on m.id = r.member_id where r.event_id = $1 order by r.created_at`,
        [eventId],
      );
      return rows.map(({ m_id, m_name, m_phone, m_created, ...r }) => ({
        ...r,
        member: { id: m_id, name: m_name, phone: m_phone, created_at: m_created },
      }));
    },
    async listMemberRsvps(memberId) {
      const rows = await q<Rsvp & { ev: ClubEvent }>(
        `select r.*, row_to_json(e.*) as ev from rsvps r join events e on e.id = r.event_id
         where r.member_id = $1 order by e.starts_at`,
        [memberId],
      );
      return rows.map(({ ev, ...r }) => ({ ...r, event: { ...ev, starts_at: new Date(ev.starts_at).toISOString() } }));
    },
    async markAttendance(eventId, memberId, attended) {
      await q("update rsvps set attended = $3 where event_id = $1 and member_id = $2", [eventId, memberId, attended]);
    },

    async addFeedback(eventId, memberId, rating, comment) {
      await q(
        `insert into feedback (event_id, member_id, rating, comment) values ($1,$2,$3,$4)
         on conflict (event_id, member_id) do update set rating = excluded.rating, comment = excluded.comment`,
        [eventId, memberId, rating, comment],
      );
    },
    async listMemberFeedbackEventIds(memberId) {
      return (await q<{ event_id: string }>("select event_id from feedback where member_id = $1", [memberId])).map((r) => r.event_id);
    },

    async getOrganizer(email) {
      return one("select email, name, club_id, is_admin from organizers where email = $1", [email.toLowerCase()]);
    },
    async setPasswordHash(email, hash) {
      await q("update organizers set password_hash = $2 where email = $1", [email.toLowerCase(), hash]);
    },
    async setAdmin(email, isAdmin) {
      await q("update organizers set is_admin = $2 where email = $1", [email.toLowerCase(), isAdmin]);
    },
    async listOrganizers() {
      return q(
        `select o.email, o.name, o.club_id, o.is_admin, o.created_at, c.name as club_name
         from organizers o left join clubs c on c.id = o.club_id order by o.created_at desc`,
      );
    },
    async bookSeat(eventId, memberId) {
      return tx(async (db) => {
        const ev = (await db.query("select capacity from events where id = $1 for update", [eventId])).rows[0];
        if (!ev) return false;
        if (ev.capacity !== null) {
          const mine = await db.query("select status from rsvps where event_id = $1 and member_id = $2", [eventId, memberId]);
          if (mine.rows[0]?.status !== "going") {
            const n = (await db.query("select count(*) as n from rsvps where event_id = $1 and status = 'going'", [eventId])).rows[0].n;
            if (n >= ev.capacity) return false;
          }
        }
        await db.query(
          `insert into rsvps (event_id, member_id, status) values ($1,$2,'going')
           on conflict (event_id, member_id) do update set status = 'going'`,
          [eventId, memberId],
        );
        return true;
      });
    },
    async deleteEvent(id) {
      if (isUuid(id)) await q("delete from events where id = $1", [id]);
    },
    async leaveClub(clubId, memberId) {
      await q("delete from memberships where club_id = $1 and member_id = $2", [clubId, memberId]);
      await q(
        `update rsvps set status = 'cancelled' where member_id = $2 and status = 'going'
           and event_id in (select id from events where club_id = $1 and starts_at > now())`,
        [clubId, memberId],
      );
    },
    async markAllAttended(eventId) {
      await q("update rsvps set attended = true where event_id = $1 and status = 'going' and attended is null", [eventId]);
    },
    async listClubFeedback(clubId) {
      return q(
        `select f.event_id, e.title as event_title, e.starts_at, f.rating, f.comment, m.name as member_name, f.created_at
         from feedback f join events e on e.id = f.event_id join members m on m.id = f.member_id
         where e.club_id = $1 order by f.created_at desc limit 200`,
        [clubId],
      );
    },
    async findMemberByPhone(phone) {
      return one<Member>(`select ${MEMBER_COLS} from members where phone = $1`, [phone]);
    },
    async rateLimited(key, limit, windowSec) {
      const r = await one<{ count: number }>(
        `insert into rate_limits (key, window_start, count) values ($1, now(), 1)
         on conflict (key) do update set
           count = case when rate_limits.window_start < now() - make_interval(secs => $2::int) then 1 else rate_limits.count + 1 end,
           window_start = case when rate_limits.window_start < now() - make_interval(secs => $2::int) then now() else rate_limits.window_start end
         returning count`,
        [key, windowSec],
      );
      if (Math.random() < 0.02) q("delete from rate_limits where window_start < now() - interval '1 day'").catch(() => {});
      return (r?.count ?? 0) > limit;
    },
    async getPasswordHash(email) {
      return (await one<{ password_hash: string }>("select password_hash from organizers where email = $1", [email.toLowerCase()]))
        ?.password_hash ?? null;
    },
    async log(e) {
      try {
        await q(
          "insert into logs (type, visitor_id, member_id, club_id, event_id) values ($1,$2,$3,$4,$5)",
          [e.type, e.visitor_id, e.member_id && isUuid(e.member_id) ? e.member_id : null,
            e.club_id && isUuid(e.club_id) ? e.club_id : null, e.event_id && isUuid(e.event_id) ? e.event_id : null],
        );
      } catch (err) {
        console.error("log failed", err); // analytics must never break a user action
      }
    },
    async snapshot(): Promise<Snapshot> {
      const [clubs, events, members, memberships, rsvps, feedback, logs] = await Promise.all([
        q<Snapshot["clubs"][number]>("select * from clubs"),
        q<Snapshot["events"][number]>("select * from events"),
        q<Snapshot["members"][number]>(`select ${MEMBER_COLS} from members`),
        q<Snapshot["memberships"][number]>("select * from memberships"),
        q<Snapshot["rsvps"][number]>("select * from rsvps"),
        q<Snapshot["feedback"][number]>("select * from feedback"),
        q<Snapshot["logs"][number]>("select type, visitor_id, member_id, club_id, event_id, created_at from logs where created_at > now() - interval '60 days'"),
      ]);
      return { clubs, events, members, memberships, rsvps, feedback, logs };
    },
  };
}
