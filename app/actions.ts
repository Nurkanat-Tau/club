"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepo } from "@/lib/data";
import {
  clearCurrentMember, clearOrgSession, getCurrentMember, getOrgSession, getVisitorId,
  setCurrentMember, setOrgSession,
} from "@/lib/session";
import { tooManyAttempts, verifyPassword } from "@/lib/auth";
import {
  clubSchema, eventSchema, feedbackSchema, formErrors, memberSchema, pick, type FormState,
} from "@/lib/validation";
import type { Member } from "@/lib/types";

/** Resolve the member: the one remembered on this device, or create/find one from the form. */
async function resolveMember(fd: FormData): Promise<{ member?: Member; state?: FormState }> {
  // Honeypot: real people never fill the hidden "website" field.
  if ((fd.get("website") as string | null)?.trim()) return { state: { ok: false, message: "Ошибка отправки" } };
  const current = await getCurrentMember();
  if (current) return { member: current };
  const raw = pick(fd, ["name", "phone", "consent"]);
  const parsed = memberSchema.safeParse(raw);
  if (!parsed.success) return { state: { ok: false, errors: formErrors(parsed.error), values: raw } };
  const member = await getRepo().upsertMemberByPhone(parsed.data.name, parsed.data.phone!);
  await setCurrentMember(member.id);
  return { member };
}

export async function joinClubAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const repo = getRepo();
  const club = await repo.getClubBySlug(String(fd.get("club_slug") ?? ""));
  if (!club) return { ok: false, message: "Клуб не найден" };
  const { member, state } = await resolveMember(fd);
  if (!member) return state!;
  await repo.joinClub(club.id, member.id, String(fd.get("source") ?? "") || null);
  await repo.log({ type: "join_club", visitor_id: await getVisitorId(), member_id: member.id, club_id: club.id, event_id: null });
  revalidatePath(`/c/${club.slug}`);
  return { ok: true, message: "Вы в клубе!" };
}

export async function rsvpAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const repo = getRepo();
  const event = await repo.getEvent(String(fd.get("event_id") ?? ""));
  if (!event || event.status !== "scheduled") return { ok: false, message: "Встреча недоступна" };
  if (new Date(event.starts_at).getTime() < Date.now() - 60 * 60 * 1000)
    return { ok: false, message: "Эта встреча уже прошла" };
  const { member, state } = await resolveMember(fd);
  if (!member) return state!;

  const existing = await repo.getRsvp(event.id, member.id);
  if (existing?.status !== "going" && event.capacity !== null) {
    const going = (await repo.countGoing([event.id]))[event.id] ?? 0;
    if (going >= event.capacity) return { ok: false, message: "К сожалению, мест больше нет" };
  }
  await repo.setRsvp(event.id, member.id, "going");
  await repo.joinClub(event.club_id, member.id, "event");
  await repo.log({ type: "rsvp", visitor_id: await getVisitorId(), member_id: member.id, club_id: event.club_id, event_id: event.id });
  revalidatePath(`/e/${event.id}`);
  return { ok: true, message: "Вы записаны!" };
}

export async function cancelRsvpAction(fd: FormData) {
  const repo = getRepo();
  const member = await getCurrentMember();
  const event = await repo.getEvent(String(fd.get("event_id") ?? ""));
  if (!member || !event) return;
  await repo.setRsvp(event.id, member.id, "cancelled");
  await repo.log({ type: "cancel_rsvp", visitor_id: await getVisitorId(), member_id: member.id, club_id: event.club_id, event_id: event.id });
  revalidatePath(`/e/${event.id}`);
  revalidatePath("/me");
}

export async function feedbackAction(fd: FormData) {
  const repo = getRepo();
  const member = await getCurrentMember();
  const eventId = String(fd.get("event_id") ?? "");
  if (!member) return;
  const rsvp = await repo.getRsvp(eventId, member.id);
  if (!rsvp || rsvp.status !== "going") return; // only people who signed up can rate
  const parsed = feedbackSchema.safeParse(pick(fd, ["rating", "comment"]));
  if (!parsed.success) return;
  await repo.addFeedback(eventId, member.id, parsed.data.rating, parsed.data.comment);
  await repo.log({ type: "feedback", visitor_id: await getVisitorId(), member_id: member.id, club_id: null, event_id: eventId });
  revalidatePath("/me");
}

export async function forgetMeAction() {
  await clearCurrentMember();
  redirect("/me");
}

// ---------------- Organizer ----------------

async function requireOrg() {
  const s = await getOrgSession();
  if (!s) redirect("/org/login");
  return s;
}

/** Organizer may manage a club only if it is theirs (admin may manage any). */
async function requireClubAccess(clubId: string) {
  const s = await requireOrg();
  if (!s.isAdmin && s.club_id !== clubId) throw new Error("Forbidden");
  return s;
}

export async function loginAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const values = { email };
  if (!email || !password) return { ok: false, message: "Введите email и пароль", values };
  if (tooManyAttempts(email)) return { ok: false, message: "Слишком много попыток. Попробуйте через 15 минут.", values };
  const valid = await verifyPassword(email, password);
  const org = valid ? await getRepo().getOrganizer(email) : null;
  if (!org) return { ok: false, message: "Неверный email или пароль", values };
  await setOrgSession(email);
  redirect(org.club_id ? "/org" : "/admin");
}

export async function logoutAction() {
  await clearOrgSession();
  redirect("/org/login");
}

export async function saveEventAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const repo = getRepo();
  const eventId = String(fd.get("event_id") ?? "");
  const raw = pick(fd, ["title", "description", "starts_at", "duration_min", "location_name", "location_url", "capacity", "price_text"]);
  const parsed = eventSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: formErrors(parsed.error), values: raw };
  const input = { ...parsed.data, starts_at: parsed.data.starts_at!, capacity: parsed.data.capacity as number | null };

  if (eventId) {
    const existing = await repo.getEvent(eventId);
    if (!existing) return { ok: false, message: "Встреча не найдена" };
    await requireClubAccess(existing.club_id);
    await repo.updateEvent(eventId, input);
    revalidatePath(`/e/${eventId}`);
    return { ok: true, message: "Сохранено" };
  }
  const s = await requireOrg();
  const clubId = s.isAdmin ? String(fd.get("club_id") ?? s.club_id ?? "") : s.club_id;
  if (!clubId) return { ok: false, message: "Не выбран клуб" };
  await requireClubAccess(clubId);
  const created = await repo.createEvent(clubId, input);
  await repo.log({ type: "create_event", visitor_id: null, member_id: null, club_id: clubId, event_id: created.id });
  redirect(`/org/events/${created.id}?created=1`);
}

export async function setEventStatusAction(fd: FormData) {
  const repo = getRepo();
  const event = await repo.getEvent(String(fd.get("event_id") ?? ""));
  if (!event) return;
  await requireClubAccess(event.club_id);
  const status = fd.get("status") === "cancelled" ? "cancelled" : "scheduled";
  await repo.setEventStatus(event.id, status);
  revalidatePath(`/org/events/${event.id}`);
}

export async function markAttendanceAction(fd: FormData) {
  const repo = getRepo();
  const event = await repo.getEvent(String(fd.get("event_id") ?? ""));
  if (!event) return;
  await requireClubAccess(event.club_id);
  const memberId = String(fd.get("member_id") ?? "");
  const attended = fd.get("attended") === "yes";
  await repo.markAttendance(event.id, memberId, attended);
  await repo.log({ type: "mark_attendance", visitor_id: null, member_id: memberId, club_id: event.club_id, event_id: event.id });
  revalidatePath(`/org/events/${event.id}`);
}

export async function saveClubAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const clubId = String(fd.get("club_id") ?? "");
  await requireClubAccess(clubId);
  const raw = pick(fd, ["description", "organizer_name", "organizer_bio", "instagram", "chat_link", "meeting_point", "schedule_text"]);
  const parsed = clubSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: formErrors(parsed.error), values: raw };
  const repo = getRepo();
  await repo.updateClub(clubId, parsed.data);
  const club = await repo.getClubById(clubId);
  if (club) revalidatePath(`/c/${club.slug}`);
  return { ok: true, message: "Сохранено" };
}
