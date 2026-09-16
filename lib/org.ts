import "server-only";
import { redirect, notFound } from "next/navigation";
import { getRepo } from "./data";
import { getOrgSession } from "./session";

/** Organizer pages: returns the club this user manages. Admins pick a club with ?club=<id>. */
export async function getManagedClub(clubParam?: string | string[]) {
  const session = await getOrgSession();
  if (!session) redirect("/org/login");
  const wanted = typeof clubParam === "string" ? clubParam : undefined;
  const clubId = session.isAdmin ? wanted ?? session.club_id : session.club_id;
  if (!clubId) redirect(session.isAdmin ? "/admin" : "/new-club");
  const club = await getRepo().getClubById(clubId);
  if (!club) notFound();
  const q = session.isAdmin ? `?club=${club.id}` : "";
  return { session, club, q };
}
