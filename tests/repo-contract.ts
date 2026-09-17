import { expect } from "vitest";
import type { Repo } from "../lib/types";

/** Shared checks for the features added after the audit. Runs against memory and Postgres. */
export async function newFeaturesContract(repo: Repo) {
  const club = await repo.createClubWithOrganizer("shymkent", {
    name: "Шахматы", category: "Шахматы", emoji: "♟️", color: "#0a0", description: "d".repeat(20),
    schedule_text: "вс 12:00", meeting_point: "кафе", chat_link: null, instagram: null, organizer_name: "Ерлан", organizer_bio: "",
  }, "erlan@x.kz", "h1");

  // organizers + admin flag
  expect((await repo.getOrganizer("erlan@x.kz"))?.is_admin).toBe(false);
  await repo.setAdmin("erlan@x.kz", true);
  expect((await repo.getOrganizer("erlan@x.kz"))?.is_admin).toBe(true);
  await repo.setPasswordHash("erlan@x.kz", "h2");
  expect(await repo.getPasswordHash("erlan@x.kz")).toBe("h2");
  const orgs = await repo.listOrganizers();
  expect(orgs.find((o) => o.email === "erlan@x.kz")?.club_name).toBe("Шахматы");

  // atomic seat booking
  const ev = await repo.createEvent(club.id, {
    title: "Турнир", description: "", starts_at: new Date(Date.now() + 86400000).toISOString(), duration_min: 60,
    location_name: "Кафе", location_url: null, capacity: 1, price_text: null,
  });
  const a = await repo.createMember("Аня", "+77010000001", "p");
  const b = await repo.createMember("Боря", "+77010000002", "p");
  expect((await repo.findMemberByPhone("+77010000001"))?.id).toBe(a.id);
  expect(await repo.findMemberByPhone("+77019999999")).toBeNull();
  const results = await Promise.all([repo.bookSeat(ev.id, a.id), repo.bookSeat(ev.id, b.id)]);
  expect(results.filter(Boolean).length).toBe(1);
  expect((await repo.countGoing([ev.id]))[ev.id]).toBe(1);
  const winner = results[0] ? a : b;
  expect(await repo.bookSeat(ev.id, winner.id)).toBe(true); // re-booking own seat is fine

  // mark all + feedback list
  await repo.markAllAttended(ev.id);
  expect((await repo.getRsvp(ev.id, winner.id))?.attended).toBe(true);
  await repo.addFeedback(ev.id, winner.id, 5, "супер");
  const fb = await repo.listClubFeedback(club.id);
  expect(fb[0]).toMatchObject({ event_title: "Турнир", rating: 5, comment: "супер", member_name: winner.name });

  // leaving cancels upcoming sign-ups
  await repo.joinClub(club.id, winner.id, null);
  await repo.leaveClub(club.id, winner.id);
  expect(await repo.isMember(club.id, winner.id)).toBe(false);
  expect((await repo.getRsvp(ev.id, winner.id))?.status).toBe("cancelled");

  // rate limit
  expect(await repo.rateLimited("t:1", 2, 60)).toBe(false);
  expect(await repo.rateLimited("t:1", 2, 60)).toBe(false);
  expect(await repo.rateLimited("t:1", 2, 60)).toBe(true);
  expect(await repo.rateLimited("t:2", 2, 60)).toBe(false);

  // delete a member: their sign-ups go too
  const c = await repo.createMember("Вика", "+77010000003", "");
  await repo.joinClub(club.id, c.id, null);
  await repo.deleteMember(c.id);
  expect(await repo.findMemberByPhone("+77010000003")).toBeNull();
  expect(await repo.isMember(club.id, c.id)).toBe(false);

  // delete event
  await repo.deleteEvent(ev.id);
  expect(await repo.getEvent(ev.id)).toBeNull();
  await repo.deleteClub(club.id);
}
