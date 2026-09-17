import "server-only";
import { headers } from "next/headers";
import { getRepo } from "./data";
import { getVisitorId } from "./session";
import type { LogEntry } from "./types";

const BOT = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|preview|headless|lighthouse|vercel/i;

/** Page-view logging that skips bots and link-preview fetchers. Never throws. */
export async function logView(entry: Omit<LogEntry, "created_at" | "visitor_id">) {
  try {
    const ua = (await headers()).get("user-agent") ?? "";
    if (!ua || BOT.test(ua)) return;
    await getRepo().log({ ...entry, visitor_id: await getVisitorId() });
  } catch {
    /* analytics must never break a page */
  }
}
