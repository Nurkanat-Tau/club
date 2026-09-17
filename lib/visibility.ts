import "server-only";
import { getRepo } from "./data";
import { getOrgSession } from "./session";
import type { Club } from "./types";

/** A club as the current visitor may see it: hidden clubs only for their organizer and admins. */
export async function getVisibleClubBySlug(slug: string): Promise<Club | null> {
  const club = await getRepo().getClubBySlug(slug);
  return canSee(club);
}

export async function getVisibleClubById(id: string): Promise<Club | null> {
  return canSee(await getRepo().getClubById(id));
}

async function canSee(club: Club | null) {
  if (!club || !club.hidden) return club;
  const s = await getOrgSession();
  return s && (s.isAdmin || s.club_id === club.id) ? club : null;
}

/** For link previews (no session): hidden clubs never get a preview. */
export async function getPublicClubBySlug(slug: string) {
  const c = await getRepo().getClubBySlug(slug);
  return c && !c.hidden ? c : null;
}
