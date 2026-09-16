import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Repo, Club, ClubEvent, Member, Rsvp, Snapshot } from "../types";

/**
 * Server-only Supabase repository. Uses the service-role key, so it must never be imported
 * into client components. Row Level Security is enabled on every table with no public
 * policies, which means the browser (anon key) cannot read or write anything directly.
 */
function must<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(`Database error: ${res.error.message}`);
  return res.data;
}

export function createSupabaseRepo(url: string, serviceKey: string): Repo {
  const db: SupabaseClient = createClient(url, serviceKey, { auth: { persistSession: false } });

  async function all<T>(table: string): Promise<T[]> {
    const out: T[] = [];
    for (let from = 0; ; from += 1000) {
      const rows = must(await db.from(table).select("*").range(from, from + 999)) as T[];
      out.push(...rows);
      if (rows.length < 1000) break;
    }
    return out;
  }

  return {
    async listClubs(city) {
      return must(await db.from("clubs").select("*").eq("city", city).order("created_at")) as Club[];
    },
    async getClubBySlug(slug) {
      return must(await db.from("clubs").select("*").eq("slug", slug).maybeSingle()) as Club | null;
    },
    async getClubById(id) {
      return must(await db.from("clubs").select("*").eq("id", id).maybeSingle()) as Club | null;
    },
    async updateClub(id, input) {
      must(await db.from("clubs").update(input).eq("id", id));
    },

    async listEvents({ city, clubId, from, to, includeCancelled }) {
      let q = db.from("events").select(city ? "*, clubs!inner(city)" : "*").order("starts_at");
      if (city) q = q.eq("clubs.city", city);
      if (clubId) q = q.eq("club_id", clubId);
      if (from) q = q.gte("starts_at", from);
      if (to) q = q.lt("starts_at", to);
      if (!includeCancelled) q = q.eq("status", "scheduled");
      const rows = must(await q) as unknown as (ClubEvent & { clubs?: unknown })[];
      return rows.map((row) => {
        const e = { ...row };
        delete e.clubs;
        return e as ClubEvent;
      });
    },
    async getEvent(id) {
      if (!isUuid(id)) return null;
      return must(await db.from("events").select("*").eq("id", id).maybeSingle()) as ClubEvent | null;
    },
    async createEvent(clubId, input) {
      return must(await db.from("events").insert({ ...input, club_id: clubId }).select().single()) as ClubEvent;
    },
    async updateEvent(id, input) {
      must(await db.from("events").update(input).eq("id", id));
    },
    async setEventStatus(id, status) {
      must(await db.from("events").update({ status }).eq("id", id));
    },

    async upsertMemberByPhone(name, phone) {
      const existing = must(await db.from("members").select("*").eq("phone", phone).maybeSingle()) as Member | null;
      if (existing) return existing;
      const res = await db.from("members").insert({ name, phone }).select().single();
      if (res.error?.code === "23505") {
        // Race: another request created it first.
        return must(await db.from("members").select("*").eq("phone", phone).single()) as Member;
      }
      return must(res) as Member;
    },
    async getMember(id) {
      if (!isUuid(id)) return null;
      return must(await db.from("members").select("*").eq("id", id).maybeSingle()) as Member | null;
    },

    async joinClub(clubId, memberId, source) {
      must(await db.from("memberships").upsert({ club_id: clubId, member_id: memberId, source }, { onConflict: "club_id,member_id", ignoreDuplicates: true }));
    },
    async isMember(clubId, memberId) {
      const r = await db.from("memberships").select("club_id", { count: "exact", head: true }).eq("club_id", clubId).eq("member_id", memberId);
      if (r.error) throw new Error(r.error.message);
      return (r.count ?? 0) > 0;
    },
    async countMembers(clubId) {
      const r = await db.from("memberships").select("club_id", { count: "exact", head: true }).eq("club_id", clubId);
      if (r.error) throw new Error(r.error.message);
      return r.count ?? 0;
    },
    async listClubMembers(clubId) {
      const rows = must(await db.from("memberships").select("created_at, members(*)").eq("club_id", clubId).order("created_at", { ascending: false })) as unknown as { created_at: string; members: Member }[];
      const events = must(await db.from("events").select("id").eq("club_id", clubId)) as { id: string }[];
      const ids = events.map((e) => e.id);
      const attended = ids.length
        ? (must(await db.from("rsvps").select("member_id").in("event_id", ids).eq("attended", true)) as { member_id: string }[])
        : [];
      const counts = new Map<string, number>();
      attended.forEach((a) => counts.set(a.member_id, (counts.get(a.member_id) ?? 0) + 1));
      return rows.map((r) => ({ ...r.members, joined_at: r.created_at, attended_count: counts.get(r.members.id) ?? 0 }));
    },
    async listMemberClubs(memberId) {
      const rows = must(await db.from("memberships").select("clubs(*)").eq("member_id", memberId)) as unknown as { clubs: Club }[];
      return rows.map((r) => r.clubs);
    },

    async setRsvp(eventId, memberId, status) {
      must(await db.from("rsvps").upsert({ event_id: eventId, member_id: memberId, status }, { onConflict: "event_id,member_id" }));
    },
    async getRsvp(eventId, memberId) {
      return must(await db.from("rsvps").select("*").eq("event_id", eventId).eq("member_id", memberId).maybeSingle()) as Rsvp | null;
    },
    async countGoing(eventIds) {
      const out: Record<string, number> = {};
      eventIds.forEach((id) => (out[id] = 0));
      if (!eventIds.length) return out;
      const rows = must(await db.from("rsvps").select("event_id").in("event_id", eventIds).eq("status", "going")) as { event_id: string }[];
      rows.forEach((r) => out[r.event_id]++);
      return out;
    },
    async listEventRsvps(eventId) {
      const rows = must(await db.from("rsvps").select("*, member:members(*)").eq("event_id", eventId).order("created_at")) as unknown as (Rsvp & { member: Member })[];
      return rows;
    },
    async listMemberRsvps(memberId) {
      const rows = must(await db.from("rsvps").select("*, event:events(*)").eq("member_id", memberId)) as unknown as (Rsvp & { event: ClubEvent })[];
      return rows.filter((r) => r.event).sort((a, b) => a.event.starts_at.localeCompare(b.event.starts_at));
    },
    async markAttendance(eventId, memberId, attended) {
      must(await db.from("rsvps").update({ attended }).eq("event_id", eventId).eq("member_id", memberId));
    },

    async addFeedback(eventId, memberId, rating, comment) {
      must(await db.from("feedback").upsert({ event_id: eventId, member_id: memberId, rating, comment }, { onConflict: "event_id,member_id" }));
    },
    async listMemberFeedbackEventIds(memberId) {
      const rows = must(await db.from("feedback").select("event_id").eq("member_id", memberId)) as { event_id: string }[];
      return rows.map((r) => r.event_id);
    },

    async getOrganizer(email) {
      return must(await db.from("organizers").select("email, club_id").eq("email", email.toLowerCase()).maybeSingle());
    },
    async log(entry) {
      // Analytics must never break the user flow.
      const { error } = await db.from("logs").insert(entry);
      if (error) console.error("log failed", error.message);
    },
    async snapshot(): Promise<Snapshot> {
      const [clubs, events, members, memberships, rsvps, feedback, logs] = await Promise.all([
        all<Snapshot["clubs"][number]>("clubs"),
        all<Snapshot["events"][number]>("events"),
        all<Snapshot["members"][number]>("members"),
        all<Snapshot["memberships"][number]>("memberships"),
        all<Snapshot["rsvps"][number]>("rsvps"),
        all<Snapshot["feedback"][number]>("feedback"),
        all<Snapshot["logs"][number]>("logs"),
      ]);
      return { clubs, events, members, memberships, rsvps, feedback, logs };
    },
  };
}

function isUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}
