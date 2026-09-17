import "server-only";
import { headers } from "next/headers";
import { getRepo } from "./data";
import { checkPassword } from "./password";

/** Best-effort client IP (Vercel sets x-forwarded-for). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

/** Database-backed limits, shared by all servers. */
export const limits = {
  /** Organizer password attempts per email. */
  login: (email: string) => getRepo().rateLimited(`login:${email.toLowerCase()}`, 8, 15 * 60),
  /** Any sign-in / sign-up attempts per IP (slows down phone-number guessing). */
  memberAuth: async () => getRepo().rateLimited(`member-auth:${await clientIp()}`, 30, 15 * 60),
  /** New member profiles per IP. */
  newMember: async () => getRepo().rateLimited(`new-member:${await clientIp()}`, 15, 60 * 60),
  /** New clubs per IP. */
  newClub: async () => getRepo().rateLimited(`new-club:${await clientIp()}`, 5, 60 * 60),
  /** Admin setup code attempts per IP. */
};

/** True if the email/password pair matches an organizer account. */
export async function verifyPassword(email: string, password: string): Promise<boolean> {
  return checkPassword(password, await getRepo().getPasswordHash(email.toLowerCase()));
}
