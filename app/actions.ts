"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { z } from "zod";
import { getRepo } from "@/lib/data";
import {
  clearCurrentMember, clearOrgSession, getCurrentMember, getOrgSession, getVisitorId, isAdminEmail,
  setCurrentMember, setOrgSession,
} from "@/lib/session";
import { limits, verifyPassword } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { getCategory } from "@/lib/categories";
import { getCity } from "@/lib/cities";
import { normalizePhone } from "@/lib/phone";
import { isPast } from "@/lib/time";
import {
  accountSchema, clubSchema, eventSchema, feedbackSchema, formErrors, memberLoginSchema, memberSchema, newClubSchema,
  passwordChangeSchema, pick, walkInSchema, type FormState,
} from "@/lib/validation";
import { EmailTakenError, type Club, type Member } from "@/lib/types";

const TOO_MANY = "Слишком много попыток. Попробуйте через 15 минут.";

/** Public visitors can't use hidden clubs; their organizer and admins still can. */
async function visibleClub(club: Club | null): Promise<Club | null> {
  if (!club) return null;
  if (!club.hidden) return club;
  const s = await getOrgSession();
  return s && (s.isAdmin || s.club_id === club.id) ? club : null;
}

// ======================= Members =======================

/** The member remembered on this device, or sign up / sign in with name + phone. */
async function resolveMember(fd: FormData): Promise<{ member?: Member; state?: FormState }> {
  if ((fd.get("website") as string | null)?.trim()) return { state: { ok: false, message: "Ошибка отправки" } };
  const current = await getCurrentMember();
  if (current) return { member: current };
  const values = pick(fd, ["name", "phone"]);
  const parsed = memberSchema.safeParse(values);
  if (!parsed.success) return { state: { ok: false, errors: formErrors(parsed.error), values } };
  if (await limits.memberAuth()) return { state: { ok: false, message: TOO_MANY, values } };
  const repo = getRepo();
  const phone = parsed.data.phone!;
  let member = await repo.findMemberByPhone(phone);
  if (!member) {
    if (parsed.data.name.length < 2) return { state: { ok: false, errors: { name: "Как вас зовут?" }, values } };
    if (await limits.newMember()) return { state: { ok: false, message: "Слишком много новых профилей. Попробуйте позже.", values } };
    try {
      member = await repo.createMember(parsed.data.name, phone, "");
    } catch {
      member = await repo.findMemberByPhone(phone); // created at the same moment by another request
      if (!member) throw new Error("Could not create member");
    }
  }
  await setCurrentMember(member.id);
  return { member };
}

export async function memberLoginAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = pick(fd, ["phone"]);
  const parsed = memberLoginSchema.safeParse(values);
  if (!parsed.success) return { ok: false, errors: formErrors(parsed.error), values };
  if (await limits.memberAuth()) return { ok: false, message: TOO_MANY, values };
  const member = await getRepo().findMemberByPhone(parsed.data.phone!);
  if (!member) return { ok: false, message: "Такого номера ещё нет. Выберите клуб и нажмите «Вступить» — это займёт 10 секунд.", values };
  await setCurrentMember(member.id);
  const next = String(fd.get("next") ?? "");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/me");
}

export async function joinClubAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const repo = getRepo();
  const club = await visibleClub(await repo.getClubBySlug(String(fd.get("club_slug") ?? "")));
  if (!club) return { ok: false, message: "Клуб не найден" };
  const { member, state } = await resolveMember(fd);
  if (!member) return state!;
  await repo.joinClub(club.id, member.id, String(fd.get("source") ?? "") || null);
  await repo.log({ type: "join_club", visitor_id: await getVisitorId(), member_id: member.id, club_id: club.id, event_id: null });
  revalidatePath(`/c/${club.slug}`);
  return { ok: true, message: "Вы в клубе!" };
}

export async function leaveClubAction(fd: FormData) {
  const repo = getRepo();
  const member = await getCurrentMember();
  const club = await repo.getClubById(String(fd.get("club_id") ?? ""));
  if (!member || !club) return;
  await repo.leaveClub(club.id, member.id);
  revalidatePath(`/c/${club.slug}`);
  revalidatePath("/me");
}

export async function rsvpAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const repo = getRepo();
  const event = await repo.getEvent(String(fd.get("event_id") ?? ""));
  const club = event ? await visibleClub(await repo.getClubById(event.club_id)) : null;
  if (!event || !club || event.status !== "scheduled") return { ok: false, message: "Встреча недоступна" };
  if (isPast(event.starts_at, 60)) return { ok: false, message: "Эта встреча уже прошла" };
  const { member, state } = await resolveMember(fd);
  if (!member) return state!;
  if (!(await repo.bookSeat(event.id, member.id))) return { ok: false, message: "К сожалению, мест больше нет" };
  await repo.joinClub(event.club_id, member.id, "event");
  await repo.log({ type: "rsvp", visitor_id: await getVisitorId(), member_id: member.id, club_id: event.club_id, event_id: event.id });
  revalidatePath(`/e/${event.id}`);
  return { ok: true, message: "Вы записаны!" };
}

export async function cancelRsvpAction(fd: FormData) {
  const repo = getRepo();
  const member = await getCurrentMember();
  const event = await repo.getEvent(String(fd.get("event_id") ?? ""));
  if (!member || !event || isPast(event.starts_at)) return; // can't un-register from something that already started
  await repo.setRsvp(event.id, member.id, "cancelled");
  await repo.log({ type: "cancel_rsvp", visitor_id: await getVisitorId(), member_id: member.id, club_id: event.club_id, event_id: event.id });
  revalidatePath(`/e/${event.id}`);
  revalidatePath("/me");
}

export async function feedbackAction(fd: FormData) {
  const repo = getRepo();
  const member = await getCurrentMember();
  const event = await repo.getEvent(String(fd.get("event_id") ?? ""));
  if (!member || !event || !isPast(event.starts_at)) return; // only after it started
  const rsvp = await repo.getRsvp(event.id, member.id);
  if (!rsvp || rsvp.status !== "going") return;
  const parsed = feedbackSchema.safeParse(pick(fd, ["rating", "comment"]));
  if (!parsed.success) return;
  await repo.addFeedback(event.id, member.id, parsed.data.rating, parsed.data.comment);
  await repo.log({ type: "feedback", visitor_id: await getVisitorId(), member_id: member.id, club_id: event.club_id, event_id: event.id });
  revalidatePath("/me");
}

export async function deleteMeAction() {
  const member = await getCurrentMember();
  if (member) await getRepo().deleteMember(member.id);
  await clearCurrentMember();
  redirect("/me?deleted=1");
}

export async function forgetMeAction() {
  await clearCurrentMember();
  redirect("/me");
}

// ======================= Organizers =======================

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

async function requireAdmin() {
  const s = await getOrgSession();
  if (!s?.isAdmin) throw new Error("Forbidden");
  return s;
}

export async function loginAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const values = { email };
  if (!email || !password) return { ok: false, message: "Введите email и пароль", values };
  if (await limits.login(email)) return { ok: false, message: TOO_MANY, values };
  const org = (await verifyPassword(email, password)) ? await getRepo().getOrganizer(email) : null;
  if (!org) return { ok: false, message: "Неверный email или пароль", values };
  await setOrgSession(email);
  redirect(org.is_admin || isAdminEmail(org.email) ? "/admin" : org.club_id ? "/org" : "/new-club");
}

export async function changePasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const s = await requireOrg();
  const parsed = passwordChangeSchema.safeParse(pick(fd, ["current", "next"]));
  if (!parsed.success) return { ok: false, errors: formErrors(parsed.error) };
  if (await limits.login(s.email)) return { ok: false, message: TOO_MANY };
  if (!(await verifyPassword(s.email, parsed.data.current)))
    return { ok: false, errors: { current: "Текущий пароль не подходит" } };
  await getRepo().setPasswordHash(s.email, await hashPassword(parsed.data.next));
  return { ok: true, message: "Пароль изменён" };
}

const CLUB_KEYS = ["name", "category", "description", "schedule_text", "meeting_point", "chat_link", "instagram", "organizer_name", "organizer_bio"];

function clubFromForm(data: z.infer<typeof clubSchema>) {
  const cat = getCategory(data.category)!;
  return { ...data, category: cat.label, emoji: cat.emoji, color: cat.color };
}

export async function createClubAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await getOrgSession();
  const signedInWithoutClub = !!session && !session.club_id;
  const raw = pick(fd, signedInWithoutClub ? CLUB_KEYS : [...CLUB_KEYS, "email", "password"]);
  const values = { ...raw, password: "" }; // never echo the password back
  const pwNote = signedInWithoutClub ? undefined : { password: "Из соображений безопасности введите пароль ещё раз" };
  if ((fd.get("website") as string | null)?.trim()) return { ok: false, message: "Ошибка отправки", values };
  const city = getCity(String(fd.get("city") ?? "shymkent"));
  if (!city) return { ok: false, message: "Город недоступен", values };
  const parsed = (signedInWithoutClub ? clubSchema : newClubSchema).safeParse(raw);
  if (!parsed.success) return { ok: false, errors: { ...pwNote, ...formErrors(parsed.error) }, values };
  if (await limits.newClub()) return { ok: false, message: "Слишком много новых клубов подряд. Попробуйте через час.", values };

  const repo = getRepo();
  const input = clubFromForm(parsed.data);
  let club: Club | null;
  let email: string;
  if (signedInWithoutClub) {
    email = session!.email;
    club = await repo.createClubForOrganizer(city.slug, input, email);
    if (!club) return { ok: false, message: "У вас уже есть клуб.", values };
  } else {
    const acc = accountSchema.parse(raw);
    email = acc.email;
    try {
      club = await repo.createClubWithOrganizer(city.slug, input, email, await hashPassword(acc.password));
    } catch (e) {
      if (!(e instanceof EmailTakenError)) throw e;
      // Existing account + right password: start a new club, or just sign in if they already have one.
      const existing = await repo.getOrganizer(email);
      const pwOk = !(await limits.login(email)) && (await verifyPassword(email, acc.password));
      if (!existing || !pwOk)
        return { ok: false, errors: { ...pwNote, email: "Этот email уже зарегистрирован — введите свой пароль от него." }, values };
      if (existing.club_id) {
        await setOrgSession(email);
        redirect("/org");
      }
      club = await repo.createClubForOrganizer(city.slug, input, email);
      if (!club) return { ok: false, message: "У вас уже есть клуб.", values };
    }
  }
  await repo.log({ type: "create_club", visitor_id: await getVisitorId(), member_id: null, club_id: club.id, event_id: null });
  await setOrgSession(email);
  revalidatePath(`/${city.slug}`);
  redirect("/org?welcome=1");
}

export async function deleteClubAction(fd: FormData) {
  const repo = getRepo();
  const club = await repo.getClubById(String(fd.get("club_id") ?? ""));
  if (!club) return;
  const session = await requireClubAccess(club.id);
  await repo.deleteClub(club.id);
  revalidatePath(`/${club.city}`);
  revalidatePath(`/c/${club.slug}`);
  revalidatePath("/admin");
  redirect(session.club_id === club.id ? "/new-club?deleted=1" : "/admin?deleted=1");
}

export async function saveClubAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const clubId = String(fd.get("club_id") ?? "");
  await requireClubAccess(clubId);
  const raw = pick(fd, CLUB_KEYS);
  const parsed = clubSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: formErrors(parsed.error), values: raw };
  const repo = getRepo();
  await repo.updateClub(clubId, clubFromForm(parsed.data));
  const club = await repo.getClubById(clubId);
  if (club) {
    revalidatePath(`/c/${club.slug}`);
    revalidatePath(`/${club.city}`);
  }
  // Show the cleaned-up values (e.g. Instagram link → nickname).
  return { ok: true, message: "Сохранено", values: { ...raw, instagram: parsed.data.instagram ?? "" } };
}

export async function removeMemberAction(fd: FormData) {
  const clubId = String(fd.get("club_id") ?? "");
  await requireClubAccess(clubId);
  await getRepo().leaveClub(clubId, String(fd.get("member_id") ?? ""));
  revalidatePath("/org/members");
}

// ----- events -----

const EVENT_KEYS = ["title", "description", "starts_at", "duration_min", "location_name", "location_url", "capacity", "price_text"];
const WEEK = 7 * 86400000;

export async function saveEventAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const repo = getRepo();
  const eventId = String(fd.get("event_id") ?? "");
  const raw = pick(fd, [...EVENT_KEYS, "repeat", "date", "time"]);
  if (!raw.starts_at && raw.date && raw.time) raw.starts_at = `${raw.date}T${raw.time.slice(0, 5)}`;
  const parsed = eventSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: formErrors(parsed.error), values: raw };
  const input = { ...parsed.data, starts_at: parsed.data.starts_at!, capacity: parsed.data.capacity as number | null };
  const inPast = new Date(input.starts_at).getTime() < Date.now() - 5 * 60 * 1000;

  if (eventId) {
    const existing = await repo.getEvent(eventId);
    if (!existing) return { ok: false, message: "Встреча не найдена" };
    await requireClubAccess(existing.club_id);
    if (inPast && input.starts_at !== existing.starts_at)
      return { ok: false, errors: { starts_at: "Нельзя перенести встречу в прошлое" }, values: raw };
    const going = (await repo.countGoing([eventId]))[eventId] ?? 0;
    if (input.capacity !== null && input.capacity < going)
      return { ok: false, errors: { capacity: `Уже записались ${going} — лимит не может быть меньше` }, values: raw };
    await repo.updateEvent(eventId, input);
    revalidatePath(`/e/${eventId}`);
    revalidatePath(`/org/events/${eventId}`);
    revalidatePath("/org");
    const moved = input.starts_at !== existing.starts_at || input.location_name !== existing.location_name;
    return {
      ok: true,
      message: moved && going > 0 ? "Сохранено. Время или место изменилось — сообщите записавшимся (текст ниже)." : "Сохранено",
      values: raw,
    };
  }

  if (inPast) return { ok: false, errors: { starts_at: "Выберите дату и время в будущем" }, values: raw };
  const s = await requireOrg();
  const clubId = s.isAdmin ? String(fd.get("club_id") ?? s.club_id ?? "") : s.club_id;
  if (!clubId) return { ok: false, message: "Не выбран клуб" };
  await requireClubAccess(clubId);
  const repeat = Math.min(Math.max(Number(raw.repeat) || 0, 0), 12);
  const created = await repo.createEvent(clubId, input);
  for (let i = 1; i <= repeat; i++) {
    await repo.createEvent(clubId, { ...input, starts_at: new Date(new Date(input.starts_at).getTime() + i * WEEK).toISOString() });
  }
  await repo.log({ type: "create_event", visitor_id: null, member_id: null, club_id: clubId, event_id: created.id });
  const q = s.isAdmin && s.club_id !== clubId ? `&club=${clubId}` : "";
  redirect(`/org/events/${created.id}?created=${repeat + 1}${q}`);
}

/** Copy an event one week later (or the next future week if it's in the past). */
export async function duplicateEventAction(fd: FormData) {
  const repo = getRepo();
  const ev = await repo.getEvent(String(fd.get("event_id") ?? ""));
  if (!ev) return;
  const s = await requireClubAccess(ev.club_id);
  let t = new Date(ev.starts_at).getTime() + WEEK;
  while (t < Date.now()) t += WEEK;
  const { id: _id, club_id: _c, status: _s, created_at: _ca, ...input } = ev;
  void _id; void _c; void _s; void _ca;
  const copy = await repo.createEvent(ev.club_id, { ...input, starts_at: new Date(t).toISOString() });
  const q = s.isAdmin && s.club_id !== ev.club_id ? `&club=${ev.club_id}` : "";
  redirect(`/org/events/${copy.id}?created=copy${q}`);
}

export async function deleteEventAction(fd: FormData) {
  const repo = getRepo();
  const ev = await repo.getEvent(String(fd.get("event_id") ?? ""));
  if (!ev) return;
  const s = await requireClubAccess(ev.club_id);
  await repo.deleteEvent(ev.id);
  revalidatePath("/org");
  redirect(s.isAdmin && s.club_id !== ev.club_id ? `/org?club=${ev.club_id}` : "/org");
}

export async function setEventStatusAction(fd: FormData) {
  const repo = getRepo();
  const event = await repo.getEvent(String(fd.get("event_id") ?? ""));
  if (!event) return;
  await requireClubAccess(event.club_id);
  const status = fd.get("status") === "cancelled" ? "cancelled" : "scheduled";
  await repo.setEventStatus(event.id, status);
  revalidatePath(`/org/events/${event.id}`);
  revalidatePath(`/e/${event.id}`);
  revalidatePath("/org");
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

export async function markAllAttendedAction(fd: FormData) {
  const repo = getRepo();
  const event = await repo.getEvent(String(fd.get("event_id") ?? ""));
  if (!event) return;
  await requireClubAccess(event.club_id);
  await repo.markAllAttended(event.id);
  revalidatePath(`/org/events/${event.id}`);
}

/** Someone came without signing up: add them and mark them as present. */
export async function addWalkInAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const repo = getRepo();
  const event = await repo.getEvent(String(fd.get("event_id") ?? ""));
  if (!event) return { ok: false, message: "Встреча не найдена" };
  await requireClubAccess(event.club_id);
  const raw = pick(fd, ["name", "phone"]);
  const parsed = walkInSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: formErrors(parsed.error), values: raw };
  const member = await repo.upsertMemberByPhone(parsed.data.name, normalizePhone(parsed.data.phone!)!);
  await repo.joinClub(event.club_id, member.id, "walk-in");
  await repo.setRsvp(event.id, member.id, "going");
  await repo.markAttendance(event.id, member.id, true);
  revalidatePath(`/org/events/${event.id}`);
  return { ok: true, message: `${member.name} отмечен(а) как пришедший` };
}

// ======================= Admin =======================

export async function deleteAllClubsAction() {
  await requireAdmin();
  const n = await getRepo().deleteAllClubs();
  revalidatePath("/shymkent");
  redirect(`/admin?deleted=all&n=${n}`);
}

export async function setClubHiddenAction(fd: FormData) {
  await requireAdmin();
  const repo = getRepo();
  const club = await repo.getClubById(String(fd.get("club_id") ?? ""));
  if (!club) return;
  await repo.setClubHidden(club.id, fd.get("hidden") === "1");
  revalidatePath("/admin");
  revalidatePath(`/${club.city}`);
  revalidatePath(`/c/${club.slug}`);
}

export async function adminResetPasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const repo = getRepo();
  if (!(await repo.getOrganizer(email))) return { ok: false, message: "Организатор не найден" };
  const temp = randomBytes(9).toString("base64url").slice(0, 12);
  await repo.setPasswordHash(email, await hashPassword(temp));
  return { ok: true, message: `Новый временный пароль для ${email}: ${temp} — передайте его лично и попросите сменить в кабинете.` };
}

export async function logoutAction() {
  await clearOrgSession();
  redirect("/org/login");
}
