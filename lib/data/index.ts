import "server-only";
import type { Repo } from "../types";
import { createMemoryRepo } from "./memory";
import { createSupabaseRepo } from "./supabase";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Demo mode = no database configured. Data lives in memory and resets on restart. */
export const DEMO_MODE = !(url && serviceKey);

let repo: Repo | null = null;
export function getRepo(): Repo {
  if (DEMO_MODE && process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO !== "1") {
    // Safety: never let real people type phone numbers into a demo deployment by accident.
    throw new Error(
      "Database is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or set ALLOW_DEMO=1 for a demo deployment.",
    );
  }
  if (!repo) repo = DEMO_MODE ? createMemoryRepo() : createSupabaseRepo(url!, serviceKey!);
  return repo;
}
