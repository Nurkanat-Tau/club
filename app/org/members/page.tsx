import { getRepo } from "@/lib/data";
import { getManagedClub } from "@/lib/org";
import { OrgNav } from "@/components/OrgNav";
import { CopyButton } from "@/components/CopyButton";
import { ConfirmButton } from "@/components/ConfirmButton";
import { removeMemberAction } from "@/app/actions";
import { formatPhone, waLink } from "@/lib/phone";
import { formatDay } from "@/lib/time";
import { countLabel, EVENTS, MEMBERS, plural } from "@/lib/text";

export const dynamic = "force-dynamic";
export const metadata = { title: "Участники", robots: { index: false } };

export default async function Members({ searchParams }: PageProps<"/org/members">) {
  const { session, club, q } = await getManagedClub((await searchParams).club);
  const members = await getRepo().listClubMembers(club.id);
  const neverCame = members.filter((m) => m.attended_count === 0);
  const csvHref = `/org/members/csv${q}`;
  const invite = `Привет! Ждём тебя на встрече клуба «${club.name}». Ближайшие встречи и запись: `;

  return (
    <>
      <OrgNav clubName={club.name} q={q} isAdmin={session.isAdmin} hidden={club.hidden} />
      <main className="space-y-4 px-4 pb-12 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-bold">{countLabel(members.length, MEMBERS).replace(/^(\d+) /, "$1 ")}</h1>
          {members.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <a href={csvHref} className="btn-ghost btn-sm">Скачать таблицу</a>
              <CopyButton text={members.map((m) => m.phone).join(", ")} label="Все номера" />
            </div>
          )}
        </div>
        {neverCame.length > 0 && (
          <p className="card bg-soft p-3 text-sm">
            {neverCame.length} {plural(neverCame.length, ["человек", "человека", "человек"])} ещё ни разу не пришли. Напишите им лично и
            пригласите на ближайшую встречу — это самый сильный рычаг.
          </p>
        )}
        <ul className="card divide-y divide-line">
          {members.map((m) => (
            <li key={m.id} className="space-y-1 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-medium">{m.name}</div>
                  <div className="text-xs text-muted">
                    с {formatDay(m.joined_at)} · {m.attended_count ? `был(а) на ${countLabel(m.attended_count, EVENTS)}` : "ещё не был(а)"}
                  </div>
                </div>
                <a
                  href={waLink(m.phone, m.attended_count ? undefined : invite)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-sm underline"
                >
                  {formatPhone(m.phone)}
                </a>
              </div>
              <form action={removeMemberAction}>
                <input type="hidden" name="club_id" value={club.id} />
                <input type="hidden" name="member_id" value={m.id} />
                <ConfirmButton label="Убрать из клуба" confirmLabel="Да, убрать" className="text-xs text-muted underline" />
              </form>
            </li>
          ))}
          {members.length === 0 && <li className="p-4 text-muted">Пока никого. Поделитесь ссылкой на клуб.</li>}
        </ul>
      </main>
    </>
  );
}
