"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { redirect } from "next/navigation";
import { getRepo } from "@/lib/data";
import {
  clearCurrentMember, clearOrgSession, getCurrentMember, getOrgSession, getVisitorId,
  setCurrentMember, setOrgSession,
} from "@/lib/session";
import { tooManyAttempts, tooManyClubs, verifyPassword } from "@/lib/auth";
import { checkPassword, hashPassword } from "@/lib/password";
import { getCategory } from "@/lib/categories";
import { getCity } from "@/lib/cities";
import { headers } from "next/headers";
import {
  accountSchema, clubSchema, eventSchema, feedbackSchema, formErrors, memberLoginSchema, memberSchema, newClubSchema, pick, type FormState,
} from "@/lib/validation";
import { EmailTakenError, type Member } from "@/lib/types";

type Repo = ReturnType<typeof getRepo>;

/** Check a member's PIN (with lockout). Members without a PIN yet get this one saved. */
async function checkMemberPin(repo: Repo, auth: NonNullable<Awaited<ReturnType<Repo["getMemberAuth"]>>>, pin: string) {
  if (auth.locked_until && new Date(auth.locked_until).getTime() > Date.now())
    return "Слишком много неверных попыток. Попробуйте через 15 минут.";
  if (!auth.pin_hash) {
    await repo.setMemberPin(auth.member.id, await hashPassword(pin));
    return null;
  }
  if (await checkPassword(pin, auth.pin_hash)) {
    await repo.clearPinFailures(auth.member.id);
    return null;
  }
  await repo.recordPinFailure(auth.member.id);
  return "Неверный PIN для этого номера.";
}

/** Resolve the member: the one remembered on this device, or sign up / sign in with the form. */
async function resolveMember(fd: FormData): Promise<{ member?: Member; state?: FormState }> {
  // Honeypot: real people never fill the hidden "website" field.
  if ((fd.get("website") as string | null)?.trim()) return { state: { ok: false, message: "Ошибка отправки" } };
  const current = await getCurrentMember();
  if (current) return { member: current };
  const raw = pick(fd, ["name", "phone", "consent", "pin"]);
  const values = { ...raw, pin: "" }; // never echo the PIN back
  const parsed = memberSchema.safeParse(raw);
  if (!parsed.success) return { state: { ok: false, errors: formErrors(parsed.error), values } };
  const repo = getRepo();
  const phone = parsed.data.phone!;
  let auth = await repo.getMemberAuth(phone);
  let member: Member;
  if (!auth) {
    try {
      member = await repo.createMember(parsed.data.name, phone, await hashPassword(parsed.data.pin));
    } catch {
      auth = await repo.getMemberAuth(phone); // created at the same moment by another request
      if (!auth) throw new Error("Could not create member");
    }
  }
  if (auth) {
    const err = await checkMemberPin(repo, auth, parsed.data.pin);
    if (err) return { state: { ok: false, errors: { pin: `Этот номер уже зарегистрирован. ${err}` }, values } };
    member = auth.member;
  }
  await setCurrentMember(member!.id);
  return { member: member! };
}

export async function memberLoginAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const raw = pick(fd, ["phone", "pin"]);
  const values = { ...raw, pin: "" };
  const parsed = memberLoginSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: formErrors(parsed.error), values };
  const repo = getRepo();
  const auth = await repo.getMemberAuth(parsed.data.phone!);
  if (!auth) return { ok: false, errors: { phone: "Номер не найден. Вступите в любой клуб — профиль создастся автоматически." }, values };
  const err = await checkMemberPin(repo, auth, parsed.data.pin);
  if (err) return { ok: false, errors: { pin: err }, values };
  await setCurrentMember(auth.member.id);
  const next = String(fd.get("next") ?? "");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/me");
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
  const admin = (process.env.ADMIN_EMAILS ?? "").toLowerCase().split(",").map((x) => x.trim()).includes(email);
  redirect(admin ? "/admin" : org.club_id ? "/org" : "/org/login");
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
  if ((fd.get("website") as string | null)?.trim()) return { ok: false, message: "Ошибка отправки", values };
  const city = getCity(String(fd.get("city") ?? "shymkent"));
  if (!city) return { ok: false, message: "Город недоступен", values };
  const parsed = (signedInWithoutClub ? clubSchema : newClubSchema).safeParse(raw);
  if (!parsed.success) return { ok: false, errors: formErrors(parsed.error), values };
  const h = await headers();
  const who = (await getVisitorId()) ?? h.get("x-forwarded-for") ?? "anon";
  if (tooManyClubs(who)) return { ok: false, message: "Слишком много новых клубов подряд. Попробуйте через час.", values };

  const repo = getRepo();
  const input = clubFromForm(parsed.data);
  let club;
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
      // Existing account whose club was deleted: the right password lets them start a new club.
      const existing = await repo.getOrganizer(email);
      const pwOk = !tooManyAttempts(email) && (await verifyPassword(email, acc.password));
      club = existing && !existing.club_id && pwOk ? await repo.createClubForOrganizer(city.slug, input, email) : null;
      if (!club)
        return { ok: false, errors: { email: "Этот email уже зарегистрирован. Войдите в кабинет или введите верный пароль." }, values };
    }
  }
  await repo.log({ type: "create_club", visitor_id: await getVisitorId(), member_id: null, club_id: club.id, event_id: null });
  await setOrgSession(email);
  revalidatePath(`/${city.slug}`);
  redirect("/org?welcome=1");
}

export async function deleteClubAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const repo = getRepo();
  const club = await repo.getClubById(String(fd.get("club_id") ?? ""));
  if (!club) return { ok: false, message: "Клуб не найден" };
  const session = await requireClubAccess(club.id);
  const typed = String(fd.get("confirm") ?? "").trim().toLowerCase();
  if (typed !== club.name.trim().toLowerCase())
    return { ok: false, errors: { confirm: "Название не совпадает — клуб не удалён." } };
  await repo.deleteClub(club.id);
  revalidatePath(`/${club.city}`);
  revalidatePath(`/c/${club.slug}`);
  revalidatePath("/admin");
  redirect(session.club_id === club.id ? "/new-club?deleted=1" : "/admin?deleted=1");
}

export async function deleteAllClubsAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const s = await getOrgSession();
  if (!s?.isAdmin) throw new Error("Forbidden");
  if (String(fd.get("confirm") ?? "").trim().toUpperCase() !== "УДАЛИТЬ ВСЁ")
    return { ok: false, errors: { confirm: "Введите «УДАЛИТЬ ВСЁ», чтобы подтвердить." } };
  const n = await getRepo().deleteAllClubs();
  revalidatePath("/shymkent");
  redirect(`/admin?deleted=all&n=${n}`);
}

export async function setClubHiddenAction(fd: FormData) {
  const s = await getOrgSession();
  if (!s?.isAdmin) throw new Error("Forbidden");
  const id = String(fd.get("club_id") ?? "");
  await getRepo().setClubHidden(id, fd.get("hidden") === "1");
  revalidatePath("/admin");
  revalidatePath("/shymkent");
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
  return { ok: true, message: "Сохранено", values: raw };
}
