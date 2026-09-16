import Link from "next/link";
import { getRepo } from "@/lib/data";
import { getManagedClub } from "@/lib/org";
import { OrgNav } from "@/components/OrgNav";
import { EventRow } from "@/components/EventRow";
import { computeMetrics } from "@/lib/metrics";

export const dynamic = "force-dynamic";
export const metadata = { title: "Кабинет организатора", robots: { index: false } };

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);

export default async function OrgHome({ searchParams }: PageProps<"/org">) {
  const sp = await searchParams;
  const { session, club, q } = await getManagedClub(sp.club);
  const repo = getRepo();
  const now = new Date().toISOString();
  const [upcoming, all, snapshot] = await Promise.all([
    repo.listEvents({ clubId: club.id, from: now }),
    repo.listEvents({ clubId: club.id, includeCancelled: true }),
    repo.snapshot(),
  ]);
  const past = all.filter((e) => e.starts_at < now).reverse().slice(0, 10);
  const going = await repo.countGoing([...upcoming, ...past].map((e) => e.id));
  const m = computeMetrics(snapshot).clubs.find((c) => c.clubId === club.id)!;
  const unmarked = new Set(
    snapshot.rsvps.filter((r) => r.status === "going" && r.attended === null).map((r) => r.event_id),
  );

  return (
    <>
      <OrgNav clubName={club.name} q={q} isAdmin={session.isAdmin} />
      <main className="space-y-6 px-4 pb-12 pt-5">
        {sp.welcome && (
          <section className="card space-y-2 border-ok p-4">
            <p className="font-semibold">🎉 Клуб создан!</p>
            <p className="text-sm text-muted">Следующий шаг — создайте первую встречу и отправьте ссылку в чат и Instagram.</p>
            <Link href={`/org/events/new${q}`} className="btn-primary btn-sm">Создать первую встречу</Link>
          </section>
        )}
        <section className="grid grid-cols-3 gap-2 text-center">
          <Stat label="участников" value={m.members} sub={`+${m.newMembers7d} за неделю`} />
          <Stat label="доходимость" value={pct(m.showRate)} sub="пришли / записались" />
          <Stat label="вернулись" value={pct(m.returnRate)} sub="2+ встречи" />
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Предстоящие</h2>
            <Link href={`/org/events/new${q}`} className="btn-primary btn-sm">+ Встреча</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="card p-4 text-muted">Нет запланированных встреч. Регулярность — главное: создайте следующую.</p>
          ) : (
            upcoming.map((e) => <EventRow key={e.id} event={e} going={going[e.id]} href={`/org/events/${e.id}${q}`} />)
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Прошедшие</h2>
          {past.length === 0 && <p className="text-muted">Пока нет.</p>}
          {past.map((e) => (
            <div key={e.id} className="relative">
              <EventRow event={e} going={going[e.id]} href={`/org/events/${e.id}${q}`} />
              {unmarked.has(e.id) && (
                <span className="absolute -top-2 right-3 rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-brand-ink">
                  отметьте посещение
                </span>
              )}
            </div>
          ))}
        </section>

        <p className="text-center text-sm">
          <Link href={`/c/${club.slug}`} className="underline">Открыть публичную страницу клуба →</Link>
        </p>
      </main>
    </>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="card p-3">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium">{label}</div>
      <div className="text-[11px] text-muted">{sub}</div>
    </div>
  );
}
