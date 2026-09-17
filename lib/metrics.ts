import type { Snapshot } from "./types";

export type ClubMetrics = {
  clubId: string;
  name: string;
  emoji: string;
  members: number;
  newMembers7d: number;
  eventsHeld: number; // past, not cancelled
  eventsUpcoming: number;
  eventsHeldLast14d: number;
  rsvpsPast: number; // "going" on past events
  attended: number; // marked attended
  markedRsvps: number; // past going RSVPs where attendance was marked
  showRate: number | null; // attended / marked
  attendees: number; // unique members who attended >= 1
  repeatAttendees: number; // unique members who attended >= 2
  returnRate: number | null; // repeat / attendees
  memberActivation: number | null; // attendees / members
  avgRating: number | null;
  ratings: number;
  active: boolean; // held >= 1 event in last 14 days or has upcoming event
};

export type Metrics = {
  generatedAt: string;
  totals: Omit<ClubMetrics, "clubId" | "name" | "emoji" | "active"> & {
    activeClubs: number;
    clubs: number;
    visitors7d: number;
    activeMembers7d: number;
    clubViewers: number;
    joinConversion: number | null; // members joined via site / unique visitors who viewed a club
    unmarkedPastEvents: number;
    multiClubMembers: number; // members in 2+ clubs
    multiClubRate: number | null;
  };
  clubs: ClubMetrics[];
  verdict: { level: "continue" | "watch" | "change" | "stop" | "early"; reasons: string[] };
};

const ratio = (a: number, b: number) => (b > 0 ? a / b : null);

export function computeMetrics(input: Snapshot, now = new Date()): Metrics {
  // Hidden clubs (spam, tests) are excluded from every number.
  const hidden = new Set(input.clubs.filter((c) => c.hidden).map((c) => c.id));
  const hiddenEvents = new Set(input.events.filter((e) => hidden.has(e.club_id)).map((e) => e.id));
  const s: Snapshot = {
    ...input,
    clubs: input.clubs.filter((c) => !c.hidden),
    events: input.events.filter((e) => !hidden.has(e.club_id)),
    memberships: input.memberships.filter((m) => !hidden.has(m.club_id)),
    rsvps: input.rsvps.filter((r) => !hiddenEvents.has(r.event_id)),
    feedback: input.feedback.filter((f) => !hiddenEvents.has(f.event_id)),
    logs: input.logs.filter((l) => !l.club_id || !hidden.has(l.club_id)),
  };
  const nowIso = now.toISOString();
  const d7 = new Date(now.getTime() - 7 * 86400000).toISOString();
  const d14 = new Date(now.getTime() - 14 * 86400000).toISOString();

  const eventById = new Map(s.events.map((e) => [e.id, e]));
  const isPast = (id: string) => {
    const e = eventById.get(id);
    return !!e && e.status === "scheduled" && e.starts_at < nowIso;
  };

  function forEvents(eventIds: Set<string>, memberIds: Set<string>) {
    const pastGoing = s.rsvps.filter((r) => eventIds.has(r.event_id) && isPast(r.event_id) && r.status === "going");
    const marked = pastGoing.filter((r) => r.attended !== null);
    const attendedRows = pastGoing.filter((r) => r.attended === true);
    const perMember = new Map<string, number>();
    attendedRows.forEach((r) => perMember.set(r.member_id, (perMember.get(r.member_id) ?? 0) + 1));
    const attendees = perMember.size;
    const repeat = [...perMember.values()].filter((n) => n >= 2).length;
    const fb = s.feedback.filter((f) => eventIds.has(f.event_id));
    const events = s.events.filter((e) => eventIds.has(e.id) && e.status === "scheduled");
    const membersInScope = s.memberships.filter((m) => memberIds.has(m.member_id));
    return {
      rsvpsPast: pastGoing.length,
      attended: attendedRows.length,
      markedRsvps: marked.length,
      showRate: ratio(attendedRows.length, marked.length),
      attendees,
      repeatAttendees: repeat,
      returnRate: ratio(repeat, attendees),
      avgRating: fb.length ? fb.reduce((a, f) => a + f.rating, 0) / fb.length : null,
      ratings: fb.length,
      eventsHeld: events.filter((e) => e.starts_at < nowIso).length,
      eventsUpcoming: events.filter((e) => e.starts_at >= nowIso).length,
      eventsHeldLast14d: events.filter((e) => e.starts_at < nowIso && e.starts_at >= d14).length,
      _membershipRows: membersInScope,
    };
  }

  const clubs: ClubMetrics[] = s.clubs.map((c) => {
    const evIds = new Set(s.events.filter((e) => e.club_id === c.id).map((e) => e.id));
    const ms = s.memberships.filter((m) => m.club_id === c.id);
    const memberIds = new Set(ms.map((m) => m.member_id));
    const { _membershipRows, ...m } = forEvents(evIds, memberIds);
    void _membershipRows;
    return {
      clubId: c.id,
      name: c.name,
      emoji: c.emoji,
      members: ms.length,
      newMembers7d: ms.filter((x) => x.created_at >= d7).length,
      ...m,
      memberActivation: ratio(m.attendees, ms.length),
      active: m.eventsHeldLast14d > 0 || m.eventsUpcoming > 0,
    };
  });

  const allEvents = new Set(s.events.map((e) => e.id));
  const allMembers = new Set(s.members.map((m) => m.id));
  const { _membershipRows, ...t } = forEvents(allEvents, allMembers);
  void _membershipRows;

  const recentLogs = s.logs.filter((l) => l.created_at >= d7);
  const visitors7d = new Set(recentLogs.map((l) => l.visitor_id).filter(Boolean)).size;
  const activeMembers7d = new Set(
    recentLogs.filter((l) => l.member_id && l.type !== "view_city").map((l) => l.member_id),
  ).size;
  const clubViewers = new Set(s.logs.filter((l) => l.type === "view_club" && l.visitor_id).map((l) => l.visitor_id)).size;
  const joinedViaSite = new Set(s.logs.filter((l) => l.type === "join_club").map((l) => l.member_id)).size;
  const unmarkedPastEvents = s.events.filter(
    (e) => isPast(e.id) && s.rsvps.some((r) => r.event_id === e.id && r.status === "going" && r.attended === null),
  ).length;

  const totalMembers = new Set(s.memberships.map((m) => m.member_id)).size;
  const clubsPerMember = new Map<string, number>();
  s.memberships.forEach((m) => clubsPerMember.set(m.member_id, (clubsPerMember.get(m.member_id) ?? 0) + 1));
  const multiClubMembers = [...clubsPerMember.values()].filter((n) => n >= 2).length;
  const totals: Metrics["totals"] = {
    ...t,
    members: totalMembers,
    newMembers7d: s.memberships.filter((m) => m.created_at >= d7).length,
    memberActivation: ratio(t.attendees, totalMembers),
    clubs: clubs.length,
    activeClubs: clubs.filter((c) => c.active).length,
    visitors7d,
    activeMembers7d,
    clubViewers,
    joinConversion: ratio(joinedViaSite, clubViewers),
    unmarkedPastEvents,
    multiClubMembers,
    multiClubRate: ratio(multiClubMembers, totalMembers),
  };

  return { generatedAt: nowIso, totals, clubs, verdict: verdictFor(totals, clubs) };
}

/**
 * Decision rules for the 4-week Shymkent pilot (see docs/01-validation.md).
 * These are starting thresholds, not laws — revisit them with real data.
 */
export function verdictFor(t: Metrics["totals"], clubs: ClubMetrics[]): Metrics["verdict"] {
  const reasons: string[] = [];
  if (t.eventsHeld < 5) {
    return { level: "early", reasons: ["Прошло меньше 5 встреч — данных пока мало для выводов."] };
  }
  const clubsWith3 = clubs.filter((c) => c.eventsHeld >= 3).length;
  const show = t.showRate ?? 0;
  const ret = t.returnRate ?? 0;

  if (t.activeClubs < 2) reasons.push(`Активны только ${t.activeClubs} клуб(а) из ${t.clubs} — организаторы не держат ритм.`);
  if (ret < 0.1 && t.attendees >= 20) reasons.push(`Возвращаются только ${Math.round(ret * 100)}% участников.`);
  if (reasons.length) return { level: "stop", reasons };

  const good =
    clubsWith3 >= 4 && t.members >= 150 && show >= 0.5 && ret >= 0.3 && t.activeClubs >= 4;
  if (good) {
    return {
      level: "continue",
      reasons: [
        `${clubsWith3} клуба провели 3+ встречи`,
        `${t.members} участников`,
        `доходимость ${Math.round(show * 100)}%`,
        `возвращаемость ${Math.round(ret * 100)}%`,
      ],
    };
  }
  if (show < 0.35) reasons.push(`Доходимость ${Math.round(show * 100)}% — люди записываются, но не приходят (проблема напоминаний или ценности).`);
  if (ret < 0.2) reasons.push(`Возвращаемость ${Math.round(ret * 100)}% — первая встреча не цепляет.`);
  if (t.joinConversion !== null && t.joinConversion < 0.1 && t.clubViewers >= 100)
    reasons.push(`Только ${Math.round(t.joinConversion * 100)}% смотревших клуб вступают — упаковка или аудитория не та.`);
  if (reasons.length) return { level: "change", reasons };
  return { level: "watch", reasons: ["Сигналы смешанные: держим курс и смотрим на возвращаемость."] };
}
