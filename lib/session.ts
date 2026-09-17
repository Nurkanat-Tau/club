import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { DEMO_MODE, getRepo } from "./data";
import type { Member, Organizer } from "./types";

const MEMBER_COOKIE = "club_m";
const ORG_COOKIE = "club_o";
export const VISITOR_COOKIE = "club_v";
const YEAR = 60 * 60 * 24 * 365;
const ORG_TTL = 60 * 60 * 24 * 30;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production" && !DEMO_MODE) {
    throw new Error("SESSION_SECRET must be set (at least 32 characters) in production.");
  }
  return "dev-only-insecure-secret-change-me-please-0000";
}

export function sign(value: string): string {
  const mac = createHmac("sha256", secret()).update(value).digest("base64url");
  return `${Buffer.from(value).toString("base64url")}.${mac}`;
}

export function unsign(token: string | undefined): string | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const value = Buffer.from(body, "base64url").toString();
  const expected = createHmac("sha256", secret()).update(value).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return value;
}

const cookieOpts = (maxAge: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge,
});

// ---------- Members (no password: name + phone, remembered on this device) ----------

export async function getCurrentMember(): Promise<Member | null> {
  const id = unsign((await cookies()).get(MEMBER_COOKIE)?.value);
  if (!id) return null;
  return getRepo().getMember(id);
}

export async function setCurrentMember(memberId: string) {
  (await cookies()).set(MEMBER_COOKIE, sign(memberId), cookieOpts(YEAR));
}

export async function clearCurrentMember() {
  (await cookies()).delete(MEMBER_COOKIE);
}

export async function getVisitorId(): Promise<string | null> {
  return (await cookies()).get(VISITOR_COOKIE)?.value ?? null;
}

// ---------- Organizers / admin (email + password) ----------

export type OrgSession = Organizer & { isAdmin: boolean };

/** Emails allowed to claim admin rights (with the setup code). Empty list = any organizer may claim. */
export function mayClaimAdmin(email: string) {
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.length === 0 || list.includes(email.toLowerCase());
}

export async function getOrgSession(): Promise<OrgSession | null> {
  const raw = unsign((await cookies()).get(ORG_COOKIE)?.value);
  if (!raw) return null;
  try {
    const { email, exp } = JSON.parse(raw) as { email: string; exp: number };
    if (Date.now() > exp) return null;
    // Re-read from the database so removing an organizer takes effect immediately.
    const org = await getRepo().getOrganizer(email);
    if (!org) return null;
    return { ...org, isAdmin: org.is_admin };
  } catch {
    return null;
  }
}

export async function setOrgSession(email: string) {
  const value = JSON.stringify({ email: email.toLowerCase(), exp: Date.now() + ORG_TTL * 1000 });
  (await cookies()).set(ORG_COOKIE, sign(value), cookieOpts(ORG_TTL));
}

export async function clearOrgSession() {
  (await cookies()).delete(ORG_COOKIE);
}
