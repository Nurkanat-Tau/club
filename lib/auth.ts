import "server-only";
import { createClient } from "@supabase/supabase-js";
import { DEMO_MODE } from "./data";
import { seedOrganizers } from "./data/seed";

// Very small in-memory brute-force guard (per server instance).
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

/** Returns true if the email/password pair is valid. */
export async function verifyPassword(email: string, password: string): Promise<boolean> {
  const key = email.toLowerCase();
  let ok = false;
  if (DEMO_MODE) {
    ok = seedOrganizers.some((o) => o.email === key && o.password === password);
  } else {
    const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await client.auth.signInWithPassword({ email: key, password });
    ok = !error;
  }
  if (ok) attempts.delete(key);
  else recordFailure(key);
  return ok;
}
