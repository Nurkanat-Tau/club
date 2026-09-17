import Link from "next/link";
import { getRepo } from "@/lib/data";
import { getManagedClub } from "@/lib/org";
import { OrgNav } from "@/components/OrgNav";
import { EventRow } from "@/components/EventRow";
import { FlashCleaner } from "@/components/FlashCleaner";
import { computeMetrics } from "@/lib/metrics";
import { countLabel, MEMBERS } from "@/lib/text";

export const dynamic = "force-dynamic";
export const metadata = { title: "Кабинет организатора", robots: { index: false } };

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);

export default async function OrgHome({ searchParams }: PageProps<"/org">) {
  const sp = await searchParams;
  const { session, club, q } = await getManagedClub(sp.club);
  const repo = getRepo();
  const now = new Date().toISOString();
  const [all, snapshot] = await Promise.all([
    repo.listEvents({ clubId: club.id, includeCancelled: true }),
    repo.snapshot(),
  ]);
  const upcoming = all.filter((e) => e.starts_at >= now);
  const pastAll = all.filter((e) => e.starts_at < now).reverse();
  const showAll = sp.past === "all";
  const past = showAll ? pastAll : pastAll.slice(0, 10);
  const going = await repo.countGoing(all.map((e) => e.id));
  // Metrics are computed on this club only (even if hidden, so the organizer still sees them).
  const m = computeMetrics({ ...snapshot, clubs: snapshot.clubs.filter((c) => c.id === club.id).map((c) => ({ ...c, hidden: false })) }).clubs[0];
  const unmarked = new Set(snapshot.rsvps.filter((r) => r.status === "going" && r.attended === null).map((r) => r.event_id));
  const amp = q ? `${q}&` : "?";

  return (
    <>
      <OrgNav clubName={club.name} q={q} isAdmin={session.isAdmin} hidden={club.hidden} />
      <FlashCleaner keys={["welcome"]} />
      <main className="space-y-6 px-4 pb-12 pt-5">
        {sp.welcome && (
          <section className="card space-y-2 border-ok p-4">
            <p className="font-semibold">🎉 Клуб создан!</p>
            <p className="text-sm text-muted">Следующий шаг — создайте первую встречу и отправьте ссылку в чат и Instagram.</p>
            <Link href={`/org/events/new${q}`} className="btn-primary btn-sm">Создать первую встречу</Link>
          </section>
        )}
        <section className="grid grid-cols-3 gap-2 text-center">
          <Stat label={countLabel(m?.members ?? 0, MEMBERS).replace(/^\d+ /, "")} value={m?.members ?? 0} sub={`+${m?.newMembers7d ?? 0} за неделю`} />
          <Stat label="доходимость" value={pct(m?.showRate ?? null)} sub="пришли / записались" />
          <Stat label="вернулись" value={pct(m?.returnRate ?? null)} sub="на 2+ встречи" />
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Предстоящие</h2>
            <Link href={`/org/events/new${q}`} className="btn-primary btn-sm">+ Встреча</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="card p-4 text-muted">
              Нет запланированных встреч. Регулярность — главное: создайте следующую (можно сразу на несколько недель вперёд).
            </p>
          ) : (
            upcoming.map((e) => <EventRow key={e.id} event={e} going={going[e.id]} href={`/org/events/${e.id}${q}`} />)
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Прошедшие</h2>
          {past.length === 0 && <p className="text-muted">Пока нет.</p>}
          {past.map((e) => (
            <EventRow
              key={e.id}
              event={e}
              going={going[e.id]}
              href={`/org/events/${e.id}${q}`}
              badge={e.status === "scheduled" && unmarked.has(e.id) ? "отметьте посещение" : undefined}
            />
          ))}
          {!showAll && pastAll.length > past.length && (
            <Link href={`/org${amp}past=all`} className="btn-ghost btn-sm">Показать все ({pastAll.length})</Link>
          )}
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
