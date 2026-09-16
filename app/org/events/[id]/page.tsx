import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getRepo } from "@/lib/data";
import { getManagedClub } from "@/lib/org";
import { OrgNav } from "@/components/OrgNav";
import { EventForm } from "@/components/EventForm";
import { CopyButton } from "@/components/CopyButton";
import { SubmitButton } from "@/components/SubmitButton";
import { markAttendanceAction, setEventStatusAction } from "@/app/actions";
import { formatDay, formatTime, isPast, toLocalInput } from "@/lib/time";
import { formatPhone, waLink } from "@/lib/phone";

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

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const publicUrl = `${origin}/e/${event.id}`;
  const when = `${formatDay(event.starts_at)} в ${formatTime(event.starts_at)}`;
  const reminder = `Привет! Напоминаю: «${event.title}» — ${when}, ${event.location_name}. Ждём вас! ${publicUrl}`;
  const invite = `${club.emoji} ${event.title}\n🗓 ${when}\n📍 ${event.location_name}\nЗапись: ${publicUrl}`;

  return (
    <>
      <OrgNav clubName={club.name} q={q} isAdmin={session.isAdmin} />
      <main className="space-y-6 px-4 pb-12 pt-5">
        {sp.created && <p className="card border-ok p-3 text-sm text-ok">Встреча создана. Отправьте ссылку в чат и Instagram 👇</p>}
        <section className="space-y-2">
          <h1 className="text-xl font-bold">{event.title}</h1>
          <p className="text-muted">{when} · {event.location_name}</p>
          {event.status === "cancelled" && <p className="chip bg-bad text-white">Отменена</p>}
          <div className="flex flex-wrap gap-2 pt-1">
            <CopyButton text={invite} label="Скопировать приглашение" />
            <CopyButton text={publicUrl} label="Скопировать ссылку" />
            <Link href={`/e/${event.id}`} className="btn-ghost btn-sm">Открыть</Link>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Записались: {going.length}
              {event.capacity !== null && ` / ${event.capacity}`}
            </h2>
            {going.length > 0 && !past && <CopyButton text={reminder} label="Текст напоминания" />}
          </div>
          {past && going.length > 0 && (
            <p className="text-sm text-muted">Отметьте, кто пришёл — это главный показатель эксперимента.</p>
          )}
          {going.length === 0 && <p className="card p-4 text-muted">Пока никто не записался.</p>}
          <ul className="card divide-y divide-line">
            {going.map((r) => (
              <li key={r.member_id} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{r.member.name}</div>
                  <a href={waLink(r.member.phone, reminder)} className="text-sm text-muted underline" target="_blank" rel="noopener noreferrer">
                    {formatPhone(r.member.phone)} · WhatsApp
                  </a>
                </div>
                <form action={markAttendanceAction} className="flex gap-1">
                  <input type="hidden" name="event_id" value={event.id} />
                  <input type="hidden" name="member_id" value={r.member_id} />
                  <button name="attended" value="yes" className={`btn-sm btn ${r.attended === true ? "bg-ok text-white" : "border border-line"}`} aria-label="Пришёл">✓</button>
                  <button name="attended" value="no" className={`btn-sm btn ${r.attended === false ? "bg-bad text-white" : "border border-line"}`} aria-label="Не пришёл">✗</button>
                </form>
              </li>
            ))}
          </ul>
          {cancelled.length > 0 && <p className="text-sm text-muted">Отменили запись: {cancelled.map((r) => r.member.name).join(", ")}</p>}
        </section>

        <details className="card p-4">
          <summary className="cursor-pointer font-semibold">Редактировать встречу</summary>
          <div className="pt-4">
            <EventForm clubId={club.id} event={{ ...event, starts_local: toLocalInput(event.starts_at) }} />
          </div>
        </details>

        <form action={setEventStatusAction} className="text-center">
          <input type="hidden" name="event_id" value={event.id} />
          <input type="hidden" name="status" value={event.status === "cancelled" ? "scheduled" : "cancelled"} />
          <SubmitButton className="text-sm text-bad underline">
            {event.status === "cancelled" ? "Вернуть встречу" : "Отменить встречу"}
          </SubmitButton>
        </form>
      </main>
    </>
  );
}
