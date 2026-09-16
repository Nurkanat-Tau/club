import { getRepo } from "@/lib/data";
import { getManagedClub } from "@/lib/org";
import { OrgNav } from "@/components/OrgNav";
import { CopyButton } from "@/components/CopyButton";
import { formatPhone, waLink } from "@/lib/phone";
import { formatDay } from "@/lib/time";

export const dynamic = "force-dynamic";
export const metadata = { title: "Участники", robots: { index: false } };

export default async function Members({ searchParams }: PageProps<"/org/members">) {
  const { session, club, q } = await getManagedClub((await searchParams).club);
  const members = await getRepo().listClubMembers(club.id);
  const csv = ["Имя,Телефон,Вступил,Посетил встреч", ...members.map((m) => `${m.name.replace(/,/g, " ")},${m.phone},${m.joined_at.slice(0, 10)},${m.attended_count}`)].join("\n");
  const neverCame = members.filter((m) => m.attended_count === 0).length;

  return (
    <>
      <OrgNav clubName={club.name} q={q} isAdmin={session.isAdmin} />
      <main className="space-y-4 px-4 pb-12 pt-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Участники: {members.length}</h1>
          <CopyButton text={csv} label="Скопировать CSV" />
        </div>
        {neverCame > 0 && (
          <p className="card bg-soft p-3 text-sm">
            {neverCame} чел. ещё ни разу не пришли. Напишите им лично и пригласите на ближайшую встречу — это самый сильный рычаг.
          </p>
        )}
        <ul className="card divide-y divide-line">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <div className="truncate font-medium">{m.name}</div>
                <div className="text-xs text-muted">с {formatDay(m.joined_at)} · был(а): {m.attended_count}</div>
              </div>
              <a href={waLink(m.phone)} target="_blank" rel="noopener noreferrer" className="shrink-0 text-sm underline">
                {formatPhone(m.phone)}
              </a>
            </li>
          ))}
          {members.length === 0 && <li className="p-4 text-muted">Пока никого. Поделитесь ссылкой на клуб.</li>}
        </ul>
      </main>
    </>
  );
}
