import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepo } from "@/lib/data";
import { getCurrentMember, getVisitorId } from "@/lib/session";
import { Header } from "@/components/Header";
import { RsvpForm } from "@/components/RsvpForm";
import { SubmitButton } from "@/components/SubmitButton";
import { cancelRsvpAction } from "@/app/actions";
import { formatDay, formatTime, isPast } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/e/[id]">) {
  const e = await getRepo().getEvent((await params).id);
  return e ? { title: `${e.title} — ${formatDay(e.starts_at)}` } : { title: "Встреча не найдена" };
}

export default async function EventPage({ params }: PageProps<"/e/[id]">) {
  const repo = getRepo();
  const event = await repo.getEvent((await params).id);
  if (!event) notFound();
  const [club, member, rsvps] = await Promise.all([
    repo.getClubById(event.club_id),
    getCurrentMember(),
    repo.listEventRsvps(event.id),
  ]);
  if (!club) notFound();
  const goingList = rsvps.filter((r) => r.status === "going");
  const mine = member ? rsvps.find((r) => r.member_id === member.id) : undefined;
  const isGoing = mine?.status === "going";
  const full = event.capacity !== null && goingList.length >= event.capacity;
  const past = isPast(event.starts_at, 60);
  await repo.log({ type: "view_event", visitor_id: await getVisitorId(), member_id: member?.id ?? null, club_id: club.id, event_id: event.id });

  const names = goingList.map((r) => r.member.name.split(" ")[0]);
  const shown = names.slice(0, 3).join(", ");
  const rest = names.length - 3;

  return (
    <>
      <Header back={{ href: `/c/${club.slug}`, label: club.name }} />
      <main className="space-y-5 px-4 pb-12 pt-6">
        <section className="space-y-2">
          <Link href={`/c/${club.slug}`} className="text-sm font-medium" style={{ color: club.color }}>
            {club.emoji} {club.name}
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{event.title}</h1>
          {event.status === "cancelled" && <p className="chip bg-bad text-white">Отменена</p>}
        </section>

        <section className="card divide-y divide-line">
          <div className="flex gap-3 p-4">
            <span className="text-xl">🗓️</span>
            <div>
              <div className="font-semibold">{formatDay(event.starts_at)}</div>
              <div className="text-muted">
                {formatTime(event.starts_at)} – {formatTime(new Date(new Date(event.starts_at).getTime() + event.duration_min * 60000).toISOString())}
              </div>
            </div>
          </div>
          <div className="flex gap-3 p-4">
            <span className="text-xl">📍</span>
            <div>
              <div className="font-semibold">{event.location_name}</div>
              {event.location_url && (
                <a href={event.location_url} className="text-sm underline" target="_blank" rel="noopener noreferrer">Открыть карту</a>
              )}
            </div>
          </div>
          {event.price_text && (
            <div className="flex gap-3 p-4">
              <span className="text-xl">💳</span>
              <div className="font-semibold">{event.price_text}</div>
            </div>
          )}
          <div className="flex gap-3 p-4">
            <span className="text-xl">👥</span>
            <div>
              <div className="font-semibold">
                Идут: {goingList.length}
                {event.capacity !== null && ` из ${event.capacity}`}
              </div>
              {names.length > 0 && (
                <div className="text-sm text-muted">
                  {shown}
                  {rest > 0 && ` и ещё ${rest}`}
                </div>
              )}
            </div>
          </div>
        </section>

        {event.description && <p className="whitespace-pre-line">{event.description}</p>}

        {event.status === "cancelled" || past ? null : isGoing ? (
          <section className="card space-y-3 p-4">
            <p className="font-semibold">✅ Вы записаны</p>
            <div className="flex flex-wrap gap-2">
              <a href={`/e/${event.id}/ics`} className="btn-ghost btn-sm">Добавить в календарь</a>
              {club.chat_link && <a href={`/go/chat/${club.slug}`} className="btn-ghost btn-sm">Чат клуба</a>}
            </div>
            <form action={cancelRsvpAction}>
              <input type="hidden" name="event_id" value={event.id} />
              <SubmitButton className="text-sm text-muted underline">Не смогу прийти</SubmitButton>
            </form>
          </section>
        ) : (
          <RsvpForm eventId={event.id} known={!!member} full={full} />
        )}
        {past && event.status !== "cancelled" && <p className="card p-4 text-center text-muted">Эта встреча уже прошла</p>}
      </main>
    </>
  );
}
