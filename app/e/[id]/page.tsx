import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepo } from "@/lib/data";
import { getCurrentMember } from "@/lib/session";
import { getVisibleClubById } from "@/lib/visibility";
import { logView } from "@/lib/analytics";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { RsvpForm } from "@/components/RsvpForm";
import { Linkified } from "@/components/Linkified";
import { ShareButton } from "@/components/ShareButton";
import { ConfirmButton } from "@/components/ConfirmButton";
import { cancelRsvpAction } from "@/app/actions";
import { formatDay, formatTime, isPast, toIcsDate } from "@/lib/time";
import { plural, PLACES } from "@/lib/text";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/e/[id]">) {
  const repo = getRepo();
  const e = await repo.getEvent((await params).id);
  const club = e ? await repo.getClubById(e.club_id) : null;
  if (!e || !club || club.hidden) return { title: "Встреча не найдена", robots: { index: false } };
  const title = `${e.title} — ${formatDay(e.starts_at)}, ${formatTime(e.starts_at)}`;
  const description = `${club.name} · ${e.location_name} · ${e.price_text ?? "Бесплатно"}`;
  return { title, description, openGraph: { title, description, url: `/e/${e.id}` } };
}

export default async function EventPage({ params }: PageProps<"/e/[id]">) {
  const repo = getRepo();
  const event = await repo.getEvent((await params).id);
  if (!event) notFound();
  const club = await getVisibleClubById(event.club_id);
  if (!club) notFound();
  const [member, rsvps] = await Promise.all([getCurrentMember(), repo.listEventRsvps(event.id)]);
  const goingList = rsvps.filter((r) => r.status === "going");
  const mine = member ? rsvps.find((r) => r.member_id === member.id) : undefined;
  const isGoing = mine?.status === "going";
  const full = event.capacity !== null && goingList.length >= event.capacity;
  const started = isPast(event.starts_at);
  const past = isPast(event.starts_at, 60);
  const cancelled = event.status === "cancelled";
  await logView({ type: "view_event", member_id: member?.id ?? null, club_id: club.id, event_id: event.id });

  const end = new Date(new Date(event.starts_at).getTime() + event.duration_min * 60000).toISOString();
  const names = goingList.map((r) => r.member.name.split(" ")[0]);
  const shown = names.slice(0, 5).join(", ");
  const rest = names.length - 5;
  const left = event.capacity !== null ? event.capacity - goingList.length : null;
  const mapHref = event.location_url ?? `https://2gis.kz/shymkent/search/${encodeURIComponent(event.location_name)}`;
  const gcal =
    `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`${event.title} (${club.name})`)}` +
    `&dates=${toIcsDate(event.starts_at)}/${toIcsDate(end)}&location=${encodeURIComponent(event.location_name)}` +
    `&details=${encodeURIComponent(event.description)}`;

  return (
    <>
      <Header back={{ href: `/c/${club.slug}`, label: club.name }} />
      <main className="space-y-5 px-4 pb-12 pt-6">
        <section className="space-y-2">
          <Link href={`/c/${club.slug}`} className="text-sm font-semibold" style={{ color: club.color }}>
            {club.emoji} {club.name}
          </Link>
          <h1 className="break-words text-2xl font-bold tracking-tight">{event.title}</h1>
          <div className="flex flex-wrap items-center gap-2">
            {cancelled && <span className="chip bg-bad text-white">Отменена организатором</span>}
            {!cancelled && past && <span className="chip">Прошла</span>}
            {!cancelled && !past && (
              <ShareButton title={event.title} text={`${club.emoji} ${event.title} — ${formatDay(event.starts_at)}, ${formatTime(event.starts_at)}`} path={`/e/${event.id}`} />
            )}
          </div>
        </section>

        {cancelled && isGoing && (
          <p className="card border-bad p-4 text-sm">
            Вы были записаны, но организатор отменил эту встречу. Следите за новыми встречами клуба.
          </p>
        )}

        <section className="card divide-y divide-line">
          <div className="flex gap-3 p-4">
            <span className="text-xl" aria-hidden="true">🗓️</span>
            <div>
              <div className={`font-semibold ${cancelled ? "line-through" : ""}`}>{formatDay(event.starts_at)}</div>
              <div className="text-muted">{formatTime(event.starts_at)} – {formatTime(end)}</div>
            </div>
          </div>
          <div className="flex gap-3 p-4">
            <span className="text-xl" aria-hidden="true">📍</span>
            <div className="min-w-0">
              <div className="break-words font-semibold">{event.location_name}</div>
              <a href={mapHref} className="text-sm underline" target="_blank" rel="noopener noreferrer">
                {event.location_url ? "Открыть карту" : "Найти в 2ГИС"}
              </a>
            </div>
          </div>
          <div className="flex gap-3 p-4">
            <span className="text-xl" aria-hidden="true">💳</span>
            <div className="font-semibold">{event.price_text ?? "Бесплатно"}</div>
          </div>
          <div className="flex gap-3 p-4">
            <span className="text-xl" aria-hidden="true">👥</span>
            <div>
              <div className="font-semibold">
                Идут: {goingList.length}
                {event.capacity !== null && ` из ${event.capacity}`}
                {left !== null && left > 0 && !past && <span className="font-normal text-muted"> · осталось {left} {plural(left, PLACES)}</span>}
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

        {event.description && <Linkified text={event.description} />}

        {cancelled || past ? null : isGoing ? (
          <section className="card space-y-3 p-4">
            <p className="font-semibold">✅ Вы записаны</p>
            <div className="flex flex-wrap gap-2">
              <a href={`/e/${event.id}/ics`} className="btn-ghost btn-sm">Календарь (iPhone)</a>
              <a href={gcal} className="btn-ghost btn-sm" target="_blank" rel="noopener noreferrer">Google Календарь</a>
              {club.chat_link && <a href={`/go/chat/${club.slug}`} className="btn-ghost btn-sm">Чат клуба</a>}
            </div>
            {!started && (
              <form action={cancelRsvpAction}>
                <input type="hidden" name="event_id" value={event.id} />
                <ConfirmButton label="Не смогу прийти" confirmLabel="Да, отменить запись" />
              </form>
            )}
          </section>
        ) : (
          <RsvpForm eventId={event.id} known={!!member} full={full} />
        )}
        {past && !cancelled && (
          <p className="card p-4 text-center text-muted">
            Эта встреча уже прошла.{" "}
            <Link href={`/c/${club.slug}`} className="underline">Ближайшие встречи клуба</Link>
          </p>
        )}
      </main>
      <Footer />
    </>
  );
}
