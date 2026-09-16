import "server-only";
import { getRepo } from "./data";
import { checkPassword } from "./password";

// Small in-memory brute-force guard (per server instance).
const attempts = new Map<string, { count: number; until: number }>();

export function tooManyAttempts(key: string) {
  const a = attempts.get(key);
  return !!a && a.count >= 5 && Date.now() < a.until;
}
function recordFailure(key: string) {
  const a = attempts.get(key);
  if (!a || Date.now() > a.until) attempts.set(key, { count: 1, until: Date.now() + 15 * 60 * 1000 });
  else a.count++;
}

/** True if the email/password pair matches an organizer account. */
export async function verifyPassword(email: string, password: string): Promise<boolean> {
  const key = email.toLowerCase();
  const ok = await checkPassword(password, await getRepo().getPasswordHash(key));
  if (ok) attempts.delete(key);
  else recordFailure(key);
  return ok;
}

// Club creation guard: at most 5 new clubs per visitor/IP per hour (per server instance).
const creations = new Map<string, number[]>();
export function tooManyClubs(key: string) {
  const now = Date.now();
  const list = (creations.get(key) ?? []).filter((t) => now - t < 3600_000);
  creations.set(key, list);
  if (list.length >= 5) return true;
  list.push(now);
  return false;
}
