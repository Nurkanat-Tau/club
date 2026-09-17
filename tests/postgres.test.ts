/**
 * Integration test against a real Postgres. Runs only when TEST_DATABASE_URL is set, e.g.
 *   TEST_DATABASE_URL=postgres://user:pw@localhost:5432/club_test npm test
 * The database is wiped first.
 */
import { describe, expect, it, beforeAll } from "vitest";
import { Client } from "pg";
import { createPostgresRepo } from "../lib/data/postgres";
import { EmailTakenError } from "../lib/types";
import { newFeaturesContract } from "./repo-contract";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("postgres repo", () => {
  beforeAll(async () => {
    const c = new Client({ connectionString: url });
    await c.connect();
    await c.query("drop table if exists rate_limits, logs, organizers, feedback, rsvps, memberships, members, events, clubs cascade");
    await c.end();
  });

  it("full flow on an empty database", async () => {
    const repo = createPostgresRepo(url!);
    expect(await repo.listClubs("shymkent")).toEqual([]); // also creates the schema
    const club = await repo.createClubWithOrganizer("shymkent", {
      name: "Бег по субботам", category: "Бег", emoji: "🏃", color: "#f00", description: "d".repeat(20),
      schedule_text: "сб 8:00", meeting_point: "парк", chat_link: null, instagram: null, organizer_name: "Алия", organizer_bio: "",
    }, "aliya@x.kz", "hash");
    expect(club.slug).toBe("beg-po-subbotam");
    expect(typeof club.created_at).toBe("string");
    await expect(repo.createClubWithOrganizer("shymkent", { ...club, organizer_bio: "" }, "aliya@x.kz", "h")).rejects.toBeInstanceOf(EmailTakenError);
    expect(await repo.getPasswordHash("ALIYA@x.kz")).toBe("hash");

    const ev = await repo.createEvent(club.id, {
      title: "Забег", description: "", starts_at: new Date(Date.now() + 86400000).toISOString(), duration_min: 60,
      location_name: "Парк", location_url: null, capacity: 2, price_text: null,
    });
    const m = await repo.upsertMemberByPhone("Дана", "+77011112233");
    const same = await repo.upsertMemberByPhone("Другое имя", "+77011112233");
    expect(same.id).toBe(m.id);
    expect(same.name).toBe("Дана");
    // PIN sign-in data
    const created = await repo.createMember("Ерлан", "+77019990011", "pinhash");
    await expect(repo.createMember("Дубль", "+77019990011", "x")).rejects.toThrow();
    const auth = await repo.getMemberAuth("+77019990011");
    expect(auth?.member).toEqual(created);
    expect(auth?.pin_hash).toBe("pinhash");
    for (let i = 0; i < 5; i++) await repo.recordPinFailure(created.id);
    expect((await repo.getMemberAuth("+77019990011"))?.locked_until).not.toBeNull();
    await repo.clearPinFailures(created.id);
    expect((await repo.getMemberAuth("+77019990011"))?.locked_until).toBeNull();
    expect((await repo.getMemberAuth("+77011112233"))?.pin_hash).toBeNull(); // made without PIN
    expect(Object.keys((await repo.getMember(m.id))!).sort()).toEqual(["created_at", "id", "name", "phone"]);

    await repo.joinClub(club.id, m.id, "test");
    await repo.joinClub(club.id, m.id, "test");
    expect(await repo.countMembers(club.id)).toBe(1);
    expect(await repo.isMember(club.id, m.id)).toBe(true);
    await repo.setRsvp(ev.id, m.id, "going");
    expect((await repo.countGoing([ev.id, "not-a-uuid"]))[ev.id]).toBe(1);
    await repo.markAttendance(ev.id, m.id, true);
    const list = await repo.listEventRsvps(ev.id);
    expect(list[0].member.name).toBe("Дана");
    expect(list[0].attended).toBe(true);
    const mine = await repo.listMemberRsvps(m.id);
    expect(mine[0].event.title).toBe("Забег");
    expect(mine[0].event.starts_at).toBe(ev.starts_at);
    const members = await repo.listClubMembers(club.id);
    expect(members[0].attended_count).toBe(1);
    await repo.addFeedback(ev.id, m.id, 5, null);
    await repo.addFeedback(ev.id, m.id, 4, "ок");
    expect(await repo.listMemberFeedbackEventIds(m.id)).toEqual([ev.id]);
    expect((await repo.listEvents({ city: "shymkent" })).length).toBe(1);
    await repo.setClubHidden(club.id, true);
    expect(await repo.listClubs("shymkent")).toEqual([]);
    expect((await repo.listEvents({ city: "shymkent" })).length).toBe(0);
    expect((await repo.listEvents({ clubId: club.id })).length).toBe(1);
    // edit + delete + re-create
    await repo.updateClub(club.id, { ...club, name: "Переименован", organizer_name: "Алия К." });
    expect((await repo.getClubById(club.id))?.name).toBe("Переименован");
    expect((await repo.getOrganizer("aliya@x.kz"))?.name).toBe("Алия К.");
    expect(await repo.createClubForOrganizer("shymkent", club, "aliya@x.kz")).toBeNull();
    await repo.deleteClub(club.id);
    expect(await repo.getEvent(ev.id)).toBeNull();
    expect(await repo.countMembers(club.id)).toBe(0);
    expect(await repo.getMember(m.id)).not.toBeNull();
    expect((await repo.getOrganizer("aliya@x.kz"))?.club_id).toBeNull();
    const again = await repo.createClubForOrganizer("shymkent", { ...club, organizer_bio: "" }, "aliya@x.kz");
    expect(again?.slug).toBe("beg-po-subbotam");
    expect(await repo.deleteAllClubs()).toBe(1);
    await repo.log({ type: "view_city", visitor_id: "v1", member_id: "garbage", club_id: null, event_id: null });
    const snap = await repo.snapshot();
    expect(snap.feedback).toEqual([]); // deleted with the club
    expect(snap.logs.length).toBe(1);
  });

  it("post-audit features", async () => {
    await newFeaturesContract(createPostgresRepo(url!));
  });
});
