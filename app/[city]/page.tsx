import { notFound } from "next/navigation";
import { getRepo } from "@/lib/data";
import { getCity } from "@/lib/cities";
import { getCurrentMember, getVisitorId } from "@/lib/session";
import { Header } from "@/components/Header";
import { ClubCard } from "@/components/ClubCard";
import { EventRow } from "@/components/EventRow";
import { waLink } from "@/lib/phone";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[city]">) {
  const city = getCity((await params).city);
  return { title: city ? `Клубы и встречи — ${city.name}` : "Город не найден" };
}

export default async function CityPage({ params }: PageProps<"/[city]">) {
  const city = getCity((await params).city);
  if (!city) notFound();
  const repo = getRepo();
  const now = new Date();
  const weekAhead = new Date(now.getTime() + 8 * 86400000).toISOString();
  const [clubs, events, member] = await Promise.all([
    repo.listClubs(city.slug),
    repo.listEvents({ city: city.slug, from: now.toISOString(), to: weekAhead }),
    getCurrentMember(),
  ]);
  const [counts, going] = await Promise.all([
    Promise.all(clubs.map((c) => repo.countMembers(c.id))),
    repo.countGoing(events.map((e) => e.id)),
  ]);
  const clubById = new Map(clubs.map((c) => [c.id, c]));
  await repo.log({ type: "view_city", visitor_id: await getVisitorId(), member_id: member?.id ?? null, club_id: null, event_id: null });
  const contact = process.env.NEXT_PUBLIC_CONTACT_WHATSAPP;

  return (
    <>
      <Header city={city.name} />
      <main className="space-y-8 px-4 pb-12 pt-6">
        <section>
          <h1 className="text-2xl font-bold tracking-tight">
            {member ? `Привет, ${member.name}!` : "Сообщества Шымкента"}
          </h1>
          <p className="mt-1 text-muted">Выберите клуб и приходите на встречу — новичкам рады.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Ближайшие встречи</h2>
          {events.length === 0 ? (
            <p className="card p-4 text-muted">На этой неделе встреч пока нет. Загляните в клубы ниже.</p>
          ) : (
            events.map((e) => <EventRow key={e.id} event={e} club={clubById.get(e.club_id)} going={going[e.id]} />)
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Клубы-основатели</h2>
          {clubs.map((c, i) => (
            <ClubCard key={c.id} club={c} members={counts[i]} />
          ))}
        </section>

        {contact && (
          <section className="card bg-soft p-5">
            <h2 className="font-semibold">Хотите свой клуб в Club?</h2>
            <p className="mt-1 text-sm text-muted">Мы ищем организаторов, которые готовы собирать людей регулярно.</p>
            <a className="btn-ghost btn-sm mt-3" href={waLink(contact, "Здравствуйте! Хочу открыть клуб в Club.")}>
              Написать нам
            </a>
          </section>
        )}
      </main>
    </>
  );
}
