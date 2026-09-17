import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getRepo } from "@/lib/data";
import { getManagedClub } from "@/lib/org";
import { OrgNav } from "@/components/OrgNav";
import { EventForm } from "@/components/EventForm";
import { CopyButton } from "@/components/CopyButton";
import { SubmitButton } from "@/components/SubmitButton";
import { ConfirmButton } from "@/components/ConfirmButton";
import { WalkInForm } from "@/components/WalkInForm";
import { FlashCleaner } from "@/components/FlashCleaner";
import {
  deleteEventAction, duplicateEventAction, markAllAttendedAction, markAttendanceAction, setEventStatusAction,
} from "@/app/actions";
import { formatDay, formatTime, isPast, toLocalInput } from "@/lib/time";
import { formatPhone, waLink } from "@/lib/phone";
import { countLabel, EVENTS } from "@/lib/text";

export const dynamic = "force-dynamic";
export const metadata = { title: "Встреча", robots: { index: false } };

export default async function ManageEvent({ params, searchParams }: PageProps<"/org/events/[id]">) {
  const sp = await searchParams;
  const { session, club, q } = await getManagedClub(sp.club);
  const repo = getRepo();
  const event = await repo.getEvent((await params).id);
  if (!event || event.club_id !== club.id) notFound();
  const rsvps = await repo.listEventRsvps(event.id);
  const going = rsvps.filter((r) => r.status === "going");
  const cancelled = rsvps.filter((r) => r.status === "cancelled");
  const past = isPast(event.starts_at);
  const isCancelled = event.status === "cancelled";
  const unmarked = going.filter((r) => r.attended === null).length;

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const publicUrl = `${origin}/e/${event.id}`;
  const when = `${formatDay(event.starts_at)} в ${formatTime(event.starts_at)}`;
  const reminder = `Привет! Напоминаю: «${event.title}» — ${when}, ${event.location_name}. Ждём вас! ${publicUrl}`;
  const moved = `Внимание: «${event.title}» теперь ${when}, ${event.location_name}. Подробности: ${publicUrl}`;
  const cancelText = `К сожалению, «${event.title}» (${when}) отменяется. Следите за новыми встречами: ${origin}/c/${club.slug}`;
  const invite = `${club.emoji} ${event.title}\n🗓 ${when}\n📍 ${event.location_name}\n💳 ${event.price_text ?? "Бесплатно"}\nЗапись: ${publicUrl}`;
  const phones = going.map((r) => r.member.phone).join(", ");
  const created = typeof sp.created === "string" ? sp.created : null;

  return (
    <>
      <OrgNav clubName={club.name} q={q} isAdmin={session.isAdmin} hidden={club.hidden} />
      <FlashCleaner keys={["created"]} />
      <main className="space-y-6 px-4 pb-12 pt-5">
        {created && (
          <p className="card border-ok p-3 text-sm text-ok">
            {created === "copy"
              ? "Копия создана на следующую неделю. Проверьте детали ниже."
              : Number(created) > 1
                ? `Создано ${countLabel(Number(created), EVENTS)} — по одной в неделю. Отправьте ссылку в чат и Instagram 👇`
                : "Встреча создана. Отправьте ссылку в чат и Instagram 👇"}
          </p>
        )}
        <section className="space-y-2">
          <h1 className="break-words text-xl font-bold">{event.title}</h1>
          <p className="break-words text-muted">{when} · {event.location_name} · {event.price_text ?? "Бесплатно"}</p>
          {isCancelled && <p className="chip bg-bad text-white">Отменена</p>}
          <div className="flex flex-wrap gap-2 pt-1">
            <CopyButton text={invite} label="Скопировать приглашение" />
            <CopyButton text={publicUrl} label="Скопировать ссылку" />
            <Link href={`/e/${event.id}`} className="btn-ghost btn-sm">Открыть</Link>
            <form action={duplicateEventAction}>
              <input type="hidden" name="event_id" value={event.id} />
              <SubmitButton className="btn-ghost btn-sm">Повторить через неделю</SubmitButton>
            </form>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">
              Записались: {going.length}
              {event.capacity !== null && ` / ${event.capacity}`}
            </h2>
            {going.length > 0 && !past && !isCancelled && <CopyButton text={reminder} label="Текст напоминания" />}
            {going.length > 0 && isCancelled && <CopyButton text={cancelText} label="Текст об отмене" />}
          </div>
          {going.length > 0 && !isCancelled && (
            <div className="flex flex-wrap gap-2">
              <CopyButton text={moved} label="Текст о переносе" />
              <CopyButton text={phones} label="Все номера" />
            </div>
          )}
          {past && going.length > 0 && !isCancelled && (
            <div className="card flex flex-wrap items-center justify-between gap-2 bg-soft p-3 text-sm">
              <span>Отметьте, кто пришёл — это главный показатель клуба.</span>
              {unmarked > 0 && (
                <form action={markAllAttendedAction}>
                  <input type="hidden" name="event_id" value={event.id} />
                  <SubmitButton className="btn-primary btn-sm">Все остальные пришли ({unmarked})</SubmitButton>
                </form>
              )}
            </div>
          )}
          {going.length === 0 && <p className="card p-4 text-muted">Пока никто не записался.</p>}
          {going.length > 0 && (
            <ul className="card divide-y divide-line">
              {going.map((r) => (
                <li key={r.member_id} className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{r.member.name}</div>
                    <a href={waLink(r.member.phone, isCancelled ? cancelText : reminder)} className="text-sm text-muted underline" target="_blank" rel="noopener noreferrer">
                      {formatPhone(r.member.phone)} · WhatsApp
                    </a>
                  </div>
                  {!isCancelled && (
                    <form action={markAttendanceAction} className="flex shrink-0 gap-1">
                      <input type="hidden" name="event_id" value={event.id} />
                      <input type="hidden" name="member_id" value={r.member_id} />
                      <button name="attended" value="yes" title="Пришёл(а)" className={`btn-sm btn ${r.attended === true ? "bg-ok text-white" : "border border-line"}`} aria-label="Пришёл" aria-pressed={r.attended === true}>✓</button>
                      <button name="attended" value="no" title="Не пришёл(а)" className={`btn-sm btn ${r.attended === false ? "bg-bad text-white" : "border border-line"}`} aria-label="Не пришёл" aria-pressed={r.attended === false}>✗</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
          {cancelled.length > 0 && <p className="text-sm text-muted">Отменили запись: {cancelled.map((r) => r.member.name).join(", ")}</p>}
          {past && !isCancelled && <WalkInForm eventId={event.id} />}
        </section>

        <details className="card p-4">
          <summary className="cursor-pointer font-semibold">Редактировать встречу</summary>
          <div className="pt-4">
            <EventForm
              clubId={club.id}
              minDate={toLocalInput(new Date().toISOString()).slice(0, 10)}
              event={{ ...event, starts_local: toLocalInput(event.starts_at) }}
            />
          </div>
        </details>

        <section className="flex flex-wrap items-center justify-between gap-3">
          <form action={setEventStatusAction}>
            <input type="hidden" name="event_id" value={event.id} />
            <input type="hidden" name="status" value={isCancelled ? "scheduled" : "cancelled"} />
            {isCancelled ? (
              <SubmitButton className="btn-ghost btn-sm">Вернуть встречу</SubmitButton>
            ) : (
              <ConfirmButton label="Отменить встречу" confirmLabel="Да, отменить" className="text-sm text-bad underline" />
            )}
          </form>
          <details>
            <summary className="cursor-pointer text-sm text-bad underline">Удалить встречу</summary>
            <form action={deleteEventAction} className="mt-2 space-y-2 text-sm">
              <input type="hidden" name="event_id" value={event.id} />
              <label className="flex items-start gap-2">
                <input type="checkbox" name="confirm" required className="mt-1" />
                <span>Удалить навсегда вместе с записями и оценками. Если люди уже записаны, лучше «Отменить».</span>
              </label>
              <SubmitButton className="btn btn-sm bg-bad text-white">Удалить</SubmitButton>
            </form>
          </details>
        </section>
      </main>
    </>
  );
}
