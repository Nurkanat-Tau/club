import { getRepo } from "@/lib/data";
import { getManagedClub } from "@/lib/org";
import { OrgNav } from "@/components/OrgNav";
import { formatDay } from "@/lib/time";
import { countLabel } from "@/lib/text";

export const dynamic = "force-dynamic";
export const metadata = { title: "Отзывы", robots: { index: false } };

export default async function Feedback({ searchParams }: PageProps<"/org/feedback">) {
  const { session, club, q } = await getManagedClub((await searchParams).club);
  const rows = await getRepo().listClubFeedback(club.id);
  const avg = rows.length ? rows.reduce((a, r) => a + r.rating, 0) / rows.length : null;
  const faces = ["😞", "😕", "😐", "🙂", "🤩"];
  return (
    <>
      <OrgNav clubName={club.name} q={q} isAdmin={session.isAdmin} hidden={club.hidden} />
      <main className="space-y-4 px-4 pb-12 pt-5">
        <h1 className="text-xl font-bold">Отзывы участников</h1>
        {avg !== null && (
          <p className="card p-4">
            Средняя оценка <b className="text-xl">{avg.toFixed(1)}</b> из 5 · {countLabel(rows.length, ["оценка", "оценки", "оценок"])}
          </p>
        )}
        {rows.length === 0 ? (
          <p className="card p-4 text-muted">
            Пока нет отзывов. Участники могут оценить встречу в «Мои встречи» после того, как она прошла — напомните им в чате.
          </p>
        ) : (
          <ul className="card divide-y divide-line">
            {rows.map((r, i) => (
              <li key={i} className="space-y-1 p-3">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate font-medium">{r.event_title}</span>
                  <span className="shrink-0 text-lg" aria-label={`${r.rating} из 5`}>{faces[r.rating - 1]} {r.rating}</span>
                </div>
                <div className="text-xs text-muted">{formatDay(r.starts_at)} · {r.member_name}</div>
                {r.comment && <p className="break-words text-sm">«{r.comment}»</p>}
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
