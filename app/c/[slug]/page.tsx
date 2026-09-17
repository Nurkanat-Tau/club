import { notFound } from "next/navigation";
import { getRepo } from "@/lib/data";
import { getCurrentMember } from "@/lib/session";
import { getVisibleClubBySlug, getPublicClubBySlug } from "@/lib/visibility";
import { logView } from "@/lib/analytics";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { EventRow } from "@/components/EventRow";
import { JoinForm } from "@/components/JoinForm";
import { Linkified } from "@/components/Linkified";
import { ShareButton } from "@/components/ShareButton";
import { formatTime, isoFromNow, relativeDay } from "@/lib/time";
import { countLabel, EVENTS, plural, MEMBERS, normalizeInstagram } from "@/lib/text";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/c/[slug]">) {
  const club = await getPublicClubBySlug((await params).slug);
  if (!club) return { title: "Клуб не найден", robots: { index: false } };
  const description = `${club.schedule_text} · ${club.meeting_point}. ${club.description}`.slice(0, 200);
  return {
    title: club.name,
    description,
    openGraph: { title: club.name, description, url: `/c/${club.slug}` },
    alternates: { canonical: `/c/${club.slug}` },
  };
}

export default async function ClubPage({ params }: PageProps<"/c/[slug]">) {
  const repo = getRepo();
  const club = await getVisibleClubBySlug((await params).slug);
  if (!club) notFound();
  const member = await getCurrentMember();
  const nowIso = new Date().toISOString();
  const [events, all, members, isMember, myRsvps] = await Promise.all([
    repo.listEvents({ clubId: club.id, from: isoFromNow(-60) }),
    repo.listEvents({ clubId: club.id }),
    repo.countMembers(club.id),
    member ? repo.isMember(club.id, member.id) : Promise.resolve(false),
    member ? repo.listMemberRsvps(member.id) : Promise.resolve([]),
  ]);
  const going = await repo.countGoing(events.map((e) => e.id));
  const held = all.filter((e) => e.starts_at < nowIso).length;
  const next = events.find((e) => e.starts_at > nowIso);
  const insta = club.instagram ? normalizeInstagram(club.instagram) : null; // older rows may hold a full URL
  await logView({ type: "view_club", member_id: member?.id ?? null, club_id: club.id, event_id: null });

  return (
    <>
      <Header back={{ href: `/${club.city}`, label: "Все клубы" }} />
      <main className="space-y-6 px-4 pb-12 pt-6">
        {club.hidden && (
          <p className="card border-bad p-3 text-sm text-bad">Клуб скрыт администратором — его видите только вы.</p>
        )}
        <section className="card overflow-hidden">
          <div className="flex h-28 items-center justify-center text-6xl" style={{ background: `${club.color}22` }}>
            {club.emoji}
          </div>
          <div className="space-y-3 p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                <span className="chip">{club.category}</span>
                {club.is_founding && <span className="chip">клуб-основатель</span>}
              </div>
              <ShareButton title={club.name} text={`${club.emoji} ${club.name} — ${club.schedule_text}`} path={`/c/${club.slug}`} />
            </div>
            <h1 className="break-words text-2xl font-bold tracking-tight">{club.name}</h1>
            <Linkified text={club.description} />
            <dl className="grid grid-cols-2 gap-3 pt-2 text-sm">
              <div>
                <dt className="text-muted">В клубе</dt>
                <dd className="text-lg font-semibold">{countLabel(members, MEMBERS)}</dd>
              </div>
              <div>
                <dt className="text-muted">Проведено</dt>
                <dd className="text-lg font-semibold">{countLabel(held, EVENTS)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted">Когда</dt>
                <dd className="break-words font-medium">{club.schedule_text}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted">Где</dt>
                <dd className="break-words font-medium">{club.meeting_point}</dd>
              </div>
            </dl>
          </div>
        </section>

        <JoinForm
          clubId={club.id}
          clubSlug={club.slug}
          known={!!member}
          isMember={isMember}
          chatHref={club.chat_link ? `/go/chat/${club.slug}` : null}
          nextEvent={next ? { id: next.id, going: myRsvps.some((r) => r.event_id === next.id && r.status === "going"), label: `${relativeDay(next.starts_at).toLowerCase()}, ${formatTime(next.starts_at)}` } : null}
        />

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Ближайшие встречи</h2>
          {events.length === 0 ? (
            <p className="card p-4 text-muted">Организатор скоро добавит встречи.</p>
          ) : (
            events.map((e) => <EventRow key={e.id} event={e} going={going[e.id]} />)
          )}
        </section>

        <section className="card space-y-2 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Организатор</h2>
          <p className="break-words text-lg font-semibold">{club.organizer_name}</p>
          {club.organizer_bio && <Linkified text={club.organizer_bio} className="text-muted" />}
          <div className="flex flex-wrap gap-2 pt-1">
            {insta && (
              <a href={`https://instagram.com/${encodeURIComponent(insta)}`} className="btn-ghost btn-sm" target="_blank" rel="noopener noreferrer">
                Instagram @{insta}
              </a>
            )}
            {club.chat_link && <a href={`/go/chat/${club.slug}`} className="btn-ghost btn-sm">Чат клуба</a>}
          </div>
          {isMember && members > 1 && <p className="text-xs text-muted">Вы и ещё {members - 1} {plural(members - 1, MEMBERS)} в этом клубе.</p>}
        </section>
      </main>
      <Footer />
    </>
  );
}
