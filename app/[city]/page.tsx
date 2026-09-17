import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepo } from "@/lib/data";
import { getCity } from "@/lib/cities";
import { getCurrentMember } from "@/lib/session";
import { logView } from "@/lib/analytics";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ClubCard } from "@/components/ClubCard";
import { EventRow } from "@/components/EventRow";
import { countLabel, EVENTS } from "@/lib/text";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[city]">) {
  const city = getCity((await params).city);
  if (!city) return { title: "Город не найден" };
  const title = `Клубы и встречи — ${city.name}`;
  const description = `Бег, английский, шахматы, теннис, походы и другие клубы ${city.name === "Шымкент" ? "Шымкента" : city.name}. Записывайтесь на встречи и знакомьтесь.`;
  return { title, description, openGraph: { title, description, url: `/${city.slug}` }, alternates: { canonical: `/${city.slug}` } };
}

export default async function CityPage({ params }: PageProps<"/[city]">) {
  const city = getCity((await params).city);
  if (!city) notFound();
  const repo = getRepo();
  const now = new Date();
  const weekAhead = new Date(now.getTime() + 8 * 86400000).toISOString();
  const later = new Date(now.getTime() + 60 * 86400000).toISOString();
  const [clubs, events, member] = await Promise.all([
    repo.listClubs(city.slug),
    repo.listEvents({ city: city.slug, from: new Date(now.getTime() - 60 * 60 * 1000).toISOString(), to: later }),
    getCurrentMember(),
  ]);
  const [counts, going] = await Promise.all([
    Promise.all(clubs.map((c) => repo.countMembers(c.id))),
    repo.countGoing(events.map((e) => e.id)),
  ]);
  const clubById = new Map(clubs.map((c) => [c.id, c]));
  const thisWeek = events.filter((e) => e.starts_at < weekAhead);
  const upcoming = events.filter((e) => e.starts_at >= weekAhead).slice(0, 20);
  await logView({ type: "view_city", member_id: member?.id ?? null, club_id: null, event_id: null });

  return (
    <>
      <Header city={city.name} />
      <main className="space-y-8 px-4 pb-12 pt-6">
        <section>
          <h1 className="text-2xl font-bold tracking-tight">
            {member ? `Привет, ${member.name}!` : `Сообщества ${city.name === "Шымкент" ? "Шымкента" : city.name}`}
          </h1>
          <p className="mt-1 text-muted">
            {clubs.length ? "Выберите клуб и приходите на встречу — новичкам рады." : "Здесь появятся клубы и встречи вашего города."}
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">
            На этой неделе{thisWeek.length ? ` · ${countLabel(thisWeek.length, EVENTS)}` : ""}
          </h2>
          {thisWeek.length === 0 ? (
            <p className="card p-4 text-muted">
              {clubs.length ? "На этой неделе встреч пока нет. Загляните в клубы ниже." : "Пока нет встреч."}
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {thisWeek.map((e) => <EventRow key={e.id} event={e} club={clubById.get(e.club_id)} going={going[e.id]} />)}
            </div>
          )}
        </section>

        {upcoming.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Позже</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {upcoming.map((e) => <EventRow key={e.id} event={e} club={clubById.get(e.club_id)} going={going[e.id]} />)}
            </div>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Клубы{clubs.length ? ` · ${clubs.length}` : ""}</h2>
          {clubs.length === 0 && (
            <div className="card space-y-2 p-5">
              <p className="font-semibold">Пока ни одного клуба</p>
              <p className="text-sm text-muted">Собираете людей на пробежки, игры или разговорный клуб? Станьте первым.</p>
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {clubs.map((c, i) => (
              <ClubCard key={c.id} club={c} members={counts[i]} />
            ))}
          </div>
        </section>

        <section className="card bg-soft p-5">
          <h2 className="font-semibold">Организуете встречи?</h2>
          <p className="mt-1 text-sm text-muted">Создайте страницу клуба за 2 минуты: запись, участники, напоминания. Бесплатно.</p>
          <Link className="btn-primary btn-sm mt-3" href="/new-club">Создать клуб</Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
