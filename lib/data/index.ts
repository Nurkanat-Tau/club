import "server-only";
import type { Repo } from "../types";
import { createMemoryRepo } from "./memory";
import { createPostgresRepo } from "./postgres";

// Vercel's Postgres integrations (Neon, Supabase, Prisma Postgres…) inject one of these.
const url =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  "";

/** Demo mode = no database configured. Data lives in memory and resets on restart. */
export const DEMO_MODE = !url;

let repo: Repo | null = null;
export function getRepo(): Repo {
  if (DEMO_MODE && process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO !== "1") {
    throw new Error("Database is not configured. Set DATABASE_URL (or connect a Postgres database in Vercel → Storage).");
  }
  if (!repo) repo = DEMO_MODE ? createMemoryRepo() : createPostgresRepo(url);
  return repo;
}
