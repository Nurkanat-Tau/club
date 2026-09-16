import { describe, expect, it, beforeEach } from "vitest";
import { normalizeKzPhone, formatPhone } from "../lib/phone";
import { fromLocalInput, toLocalInput, formatTime, relativeDay } from "../lib/time";
import { memberSchema, eventSchema } from "../lib/validation";
import { computeMetrics } from "../lib/metrics";
import { buildSeed } from "../lib/data/seed";
import { createMemoryRepo, resetMemoryStore } from "../lib/data/memory";

describe("phone", () => {
  it("normalizes common KZ formats", () => {
    expect(normalizeKzPhone("8 701 123 45 67")).toBe("+77011234567");
    expect(normalizeKzPhone("+7 (701) 123-45-67")).toBe("+77011234567");
    expect(normalizeKzPhone("7011234567")).toBe("+77011234567");
    expect(normalizeKzPhone("77011234567")).toBe("+77011234567");
  });
  it("rejects non-mobile / wrong length", () => {
    expect(normalizeKzPhone("12345")).toBeNull();
    expect(normalizeKzPhone("+7 495 123 45 67")).toBeNull(); // Moscow landline
    expect(normalizeKzPhone("")).toBeNull();
  });
  it("formats", () => expect(formatPhone("+77011234567")).toBe("+7 701 123 45 67"));
});

describe("time (Kazakhstan UTC+5)", () => {
  it("round-trips datetime-local", () => {
    const iso = fromLocalInput("2026-09-20T08:00")!;
    expect(iso).toBe("2026-09-20T03:00:00.000Z");
    expect(toLocalInput(iso)).toBe("2026-09-20T08:00");
    expect(formatTime(iso)).toBe("08:00");
  });
  it("rejects garbage", () => expect(fromLocalInput("tomorrow")).toBeNull());
  it("relative days use KZ calendar", () => {
    const now = new Date("2026-09-19T20:00:00Z"); // 01:00 on 20 Sep in KZ
    expect(relativeDay("2026-09-20T03:00:00Z", now)).toBe("Сегодня");
    expect(relativeDay("2026-09-21T03:00:00Z", now)).toBe("Завтра");
  });
});

describe("validation", () => {
  it("accepts a valid member", () => {
    const r = memberSchema.safeParse({ name: "Айгерим", phone: "87011234567", consent: "on" });
    expect(r.success && r.data.phone).toBe("+77011234567");
  });
  it("requires consent and a valid phone", () => {
    const r = memberSchema.safeParse({ name: "A", phone: "123", consent: "" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.length).toBe(3);
  });
  it("parses event form", () => {
    const r = eventSchema.safeParse({
      title: "Забег", description: "", starts_at: "2026-09-20T08:00", duration_min: "90",
      location_name: "Парк", location_url: "", capacity: "", price_text: "",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.capacity).toBeNull();
      expect(r.data.location_url).toBeNull();
    }
  });
  it("rejects bad capacity and non-http links", () => {
    const r = eventSchema.safeParse({
      title: "Забег", description: "", starts_at: "2026-09-20T08:00", duration_min: "90",
      location_name: "Парк", location_url: "javascript:alert(1)", capacity: "-3", price_text: "",
    });
    expect(r.success).toBe(false);
  });
});

describe("memory repo", () => {
  beforeEach(() => resetMemoryStore());
  it("dedupes members by phone and joins once", async () => {
    const repo = createMemoryRepo();
    const a = await repo.upsertMemberByPhone("Test", "+77019998877");
    const b = await repo.upsertMemberByPhone("Other name", "+77019998877");
    expect(a.id).toBe(b.id);
    await repo.joinClub("club-run", a.id, null);
    await repo.joinClub("club-run", a.id, null);
    expect(await repo.countMembers("club-run")).toBe(8);
  });
  it("rsvp, cancel, attendance", async () => {
    const repo = createMemoryRepo();
    const m = await repo.upsertMemberByPhone("Test", "+77019998877");
    await repo.setRsvp("ev-8", m.id, "going");
    expect((await repo.countGoing(["ev-8"]))["ev-8"]).toBe(1);
    await repo.setRsvp("ev-8", m.id, "cancelled");
    expect((await repo.countGoing(["ev-8"]))["ev-8"]).toBe(0);
    await repo.markAttendance("ev-8", m.id, true);
    expect((await repo.getRsvp("ev-8", m.id))?.attended).toBe(true);
  });
  it("lists city events in order and hides cancelled", async () => {
    const repo = createMemoryRepo();
    const evs = await repo.listEvents({ city: "shymkent" });
    expect(evs.map((e) => e.starts_at)).toEqual([...evs.map((e) => e.starts_at)].sort());
    await repo.setEventStatus(evs[0].id, "cancelled");
    expect((await repo.listEvents({ city: "shymkent" })).length).toBe(evs.length - 1);
  });
});

describe("metrics", () => {
  it("computes show rate and return rate from seed", () => {
    const m = computeMetrics(buildSeed());
    // Past going rsvps: ev1 5, ev2 5, ev3 4, ev4 3, ev5 3, ev6 3 = 23; marked = 20; attended = 4+4+4+2+2 = 16
    expect(m.totals.rsvpsPast).toBe(23);
    expect(m.totals.markedRsvps).toBe(20);
    expect(m.totals.attended).toBe(16);
    expect(m.totals.showRate).toBeCloseTo(0.8);
    expect(m.totals.unmarkedPastEvents).toBe(1);
    const run = m.clubs.find((c) => c.clubId === "club-run")!;
    expect(run.eventsHeld).toBe(2);
    expect(run.repeatAttendees).toBe(3); // m1, m2, m3 attended both
    expect(m.verdict.level).not.toBe("stop");
    // m1 is in run, english, hike; m2..m7 overlap too
    expect(m.totals.multiClubMembers).toBe(7);
  });
  it("is 'early' with no events", () => {
    const s = buildSeed();
    s.events = [];
    expect(computeMetrics(s).verdict.level).toBe("early");
  });
});
