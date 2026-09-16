import { randomUUID } from "node:crypto";
import type { Repo, Snapshot, ClubEvent, Club, Organizer } from "../types";
import { EmailTakenError } from "../types";
import { slugify } from "../slug";

type Store = Snapshot & { organizers: (Organizer & { password_hash: string })[] };
const g = globalThis as unknown as { __clubStore?: Store };

export const emptySnapshot = (): Snapshot => ({
  clubs: [], events: [], members: [], memberships: [], rsvps: [], feedback: [], logs: [],
});

function store(): Store {
  if (!g.__clubStore) g.__clubStore = { ...emptySnapshot(), organizers: [] };
  return g.__clubStore;
}

/** For tests: start from given data (default: empty). */
export function resetMemoryStore(data?: Snapshot, organizers: Store["organizers"] = []) {
  g.__clubStore = { ...(data ? structuredClone(data) : emptySnapshot()), organizers };
}

const nowIso = () => new Date().toISOString();
const byStart = (a: ClubEvent, b: ClubEvent) => a.starts_at.localeCompare(b.starts_at);

export function createMemoryRepo(): Repo {
  return {
    async listClubs(city) {
      return store().clubs.filter((c) => c.city === city && !c.hidden);
    },
    async createClubWithOrganizer(city, c, email, passwordHash) {
      const s = store();
      if (s.organizers.some((o) => o.email === email)) throw new EmailTakenError();
      const base = slugify(c.name);
      let slug = base;
      for (let i = 2; s.clubs.some((x) => x.slug === slug); i++) slug = `${base}-${i}`;
      const club: Club = {
        ...c, id: randomUUID(), slug, city, created_at: nowIso(), hidden: false,
        is_founding: s.clubs.filter((x) => x.city === city).length < 5,
      };
      s.clubs.push(club);
      s.organizers.push({ email, name: c.organizer_name, club_id: club.id, password_hash: passwordHash });
      return club;
    },
    async setClubHidden(id, hidden) {
      const c = store().clubs.find((x) => x.id === id);
      if (c) c.hidden = hidden;
    },
    async getClubBySlug(slug) {
      return store().clubs.find((c) => c.slug === slug) ?? null;
    },
    async getClubById(id) {
      return store().clubs.find((c) => c.id === id) ?? null;
    },
    async updateClub(id, input) {
      const c = store().clubs.find((x) => x.id === id);
      if (c) Object.assign(c, input);
    },

    async listEvents({ city, clubId, from, to, includeCancelled }) {
      const s = store();
      const clubIds = city
        ? new Set(s.clubs.filter((c) => c.city === city && (clubId ? true : !c.hidden)).map((c) => c.id))
        : clubId ? null : new Set(s.clubs.filter((c) => !c.hidden).map((c) => c.id));
      return s.events
        .filter((e) => (clubIds ? clubIds.has(e.club_id) : true))
        .filter((e) => (clubId ? e.club_id === clubId : true))
        .filter((e) => (from ? e.starts_at >= from : true))
        .filter((e) => (to ? e.starts_at < to : true))
        .filter((e) => includeCancelled || e.status === "scheduled")
        .sort(byStart);
    },
    async getEvent(id) {
      return store().events.find((e) => e.id === id) ?? null;
    },
    async createEvent(clubId, input) {
      const e: ClubEvent = { id: randomUUID(), club_id: clubId, status: "scheduled", created_at: nowIso(), ...input };
      store().events.push(e);
      return e;
    },
    async updateEvent(id, input) {
      const e = store().events.find((x) => x.id === id);
      if (e) Object.assign(e, input);
    },
    async setEventStatus(id, status) {
      const e = store().events.find((x) => x.id === id);
      if (e) e.status = status;
    },

    async upsertMemberByPhone(name, phone) {
      const s = store();
      const existing = s.members.find((m) => m.phone === phone);
      if (existing) return existing;
      const m = { id: randomUUID(), name, phone, created_at: nowIso() };
      s.members.push(m);
      return m;
    },
    async getMember(id) {
      return store().members.find((m) => m.id === id) ?? null;
    },

    async joinClub(clubId, memberId, source) {
      const s = store();
      if (!s.memberships.some((m) => m.club_id === clubId && m.member_id === memberId))
        s.memberships.push({ club_id: clubId, member_id: memberId, source, created_at: nowIso() });
    },
    async isMember(clubId, memberId) {
      return store().memberships.some((m) => m.club_id === clubId && m.member_id === memberId);
    },
    async countMembers(clubId) {
      return store().memberships.filter((m) => m.club_id === clubId).length;
    },
    async listClubMembers(clubId) {
      const s = store();
      const clubEvents = new Set(s.events.filter((e) => e.club_id === clubId).map((e) => e.id));
      return s.memberships
        .filter((m) => m.club_id === clubId)
        .map((ms) => {
          const m = s.members.find((x) => x.id === ms.member_id)!;
          const attended_count = s.rsvps.filter((r) => r.member_id === m.id && r.attended && clubEvents.has(r.event_id)).length;
          return { ...m, joined_at: ms.created_at, attended_count };
        })
        .sort((a, b) => b.joined_at.localeCompare(a.joined_at));
    },
    async listMemberClubs(memberId) {
      const s = store();
      const ids = new Set(s.memberships.filter((m) => m.member_id === memberId).map((m) => m.club_id));
      return s.clubs.filter((c) => ids.has(c.id) && !c.hidden);
    },

    async setRsvp(eventId, memberId, status) {
      const s = store();
      const r = s.rsvps.find((x) => x.event_id === eventId && x.member_id === memberId);
      if (r) r.status = status;
      else s.rsvps.push({ event_id: eventId, member_id: memberId, status, attended: null, created_at: nowIso() });
    },
    async getRsvp(eventId, memberId) {
      return store().rsvps.find((x) => x.event_id === eventId && x.member_id === memberId) ?? null;
    },
    async countGoing(eventIds) {
      const out: Record<string, number> = {};
      for (const id of eventIds) out[id] = 0;
      for (const r of store().rsvps) if (r.status === "going" && r.event_id in out) out[r.event_id]++;
      return out;
    },
    async listEventRsvps(eventId) {
      const s = store();
      return s.rsvps
        .filter((r) => r.event_id === eventId)
        .map((r) => ({ ...r, member: s.members.find((m) => m.id === r.member_id)! }))
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
    },
    async listMemberRsvps(memberId) {
      const s = store();
      return s.rsvps
        .filter((r) => r.member_id === memberId)
        .map((r) => ({ ...r, event: s.events.find((e) => e.id === r.event_id)! }))
        .filter((r) => r.event)
        .sort((a, b) => byStart(a.event, b.event));
    },
    async markAttendance(eventId, memberId, attended) {
      const r = store().rsvps.find((x) => x.event_id === eventId && x.member_id === memberId);
      if (r) r.attended = attended;
    },

    async addFeedback(eventId, memberId, rating, comment) {
      const s = store();
      s.feedback = s.feedback.filter((f) => !(f.event_id === eventId && f.member_id === memberId));
      s.feedback.push({ event_id: eventId, member_id: memberId, rating, comment, created_at: nowIso() });
    },
    async listMemberFeedbackEventIds(memberId) {
      return store().feedback.filter((f) => f.member_id === memberId).map((f) => f.event_id);
    },

    async getOrganizer(email) {
      const o = store().organizers.find((x) => x.email === email.toLowerCase());
      return o ? { email: o.email, name: o.name, club_id: o.club_id } : null;
    },
    async getPasswordHash(email) {
      return store().organizers.find((x) => x.email === email.toLowerCase())?.password_hash ?? null;
    },
    async log(entry) {
      store().logs.push({ ...entry, created_at: nowIso() });
    },
    async snapshot() {
      const { organizers: _o, ...snap } = store();
      void _o;
      return structuredClone(snap);
    },
  };
}
