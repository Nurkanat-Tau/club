import { notFound } from "next/navigation";
import { getRepo } from "@/lib/data";
import { getCurrentMember, getVisitorId } from "@/lib/session";
import { Header } from "@/components/Header";
import { EventRow } from "@/components/EventRow";
import { JoinForm } from "@/components/JoinForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/c/[slug]">) {
  const club = await getRepo().getClubBySlug((await params).slug);
  return club ? { title: club.name, description: club.description } : { title: "Клуб не найден" };
}

export default async function ClubPage({ params }: PageProps<"/c/[slug]">) {
  const repo = getRepo();
  const club = await repo.getClubBySlug((await params).slug);
  if (!club) notFound();
  const member = await getCurrentMember();
  const [events, members, isMember] = await Promise.all([
    repo.listEvents({ clubId: club.id, from: new Date().toISOString() }),
    repo.countMembers(club.id),
    member ? repo.isMember(club.id, member.id) : Promise.resolve(false),
  ]);
  const going = await repo.countGoing(events.map((e) => e.id));
  await repo.log({ type: "view_club", visitor_id: await getVisitorId(), member_id: member?.id ?? null, club_id: club.id, event_id: null });

  return (
    <>
      <Header back={{ href: `/${club.city}`, label: "Все клубы" }} />
      <main className="space-y-6 px-4 pb-12 pt-6">
        <section className="card overflow-hidden">
          <div className="flex h-28 items-center justify-center text-6xl" style={{ background: `${club.color}22` }}>
            {club.emoji}
          </div>
          <div className="space-y-3 p-5">
            <div className="flex flex-wrap gap-2">
              <span className="chip">{club.category}</span>
              {club.is_founding && <span className="chip">клуб-основатель</span>}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{club.name}</h1>
            <p className="whitespace-pre-line">{club.description}</p>
            <dl className="grid grid-cols-2 gap-3 pt-2 text-sm">
              <div>
                <dt className="text-muted">Участников</dt>
                <dd className="text-lg font-semibold">{members}</dd>
              </div>
              <div>
                <dt className="text-muted">Когда</dt>
                <dd className="font-medium">{club.schedule_text}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted">Где</dt>
                <dd className="font-medium">{club.meeting_point}</dd>
              </div>
            </dl>
          </div>
        </section>

        <JoinForm
          clubSlug={club.slug}
          known={!!member}
          isMember={isMember}
          chatHref={club.chat_link ? `/go/chat/${club.slug}` : null}
        />

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Ближайшие встречи</h2>
          {events.length === 0 ? (
            <p className="card p-4 text-muted">Организатор скоро добавит встречи.</p>
          ) : (
            events.map((e) => <EventRow key={e.id} event={e} going={going[e.id]} />)
          )}
        </section>

        <section className="card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Организатор</h2>
          <p className="mt-2 text-lg font-semibold">{club.organizer_name}</p>
          {club.organizer_bio && <p className="text-muted">{club.organizer_bio}</p>}
          {club.instagram && (
            <a href={`https://instagram.com/${club.instagram}`} className="mt-2 inline-block text-sm underline" target="_blank" rel="noopener noreferrer">
              @{club.instagram}
            </a>
          )}
        </section>
      </main>
    </>
  );
}
