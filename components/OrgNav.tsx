import Link from "next/link";
import { logoutAction } from "@/app/actions";

export function OrgNav({ clubName, q, isAdmin }: { clubName: string; q: string; isAdmin: boolean }) {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase text-muted">Кабинет организатора</div>
          <div className="truncate font-semibold">{clubName}</div>
        </div>
        <form action={logoutAction}>
          <button className="text-sm text-muted underline">Выйти</button>
        </form>
      </div>
      <nav className="mt-3 flex gap-2 overflow-x-auto text-sm">
        <Link href={`/org${q}`} className="chip shrink-0 whitespace-nowrap py-1.5">Встречи</Link>
        <Link href={`/org/events/new${q}`} className="chip shrink-0 whitespace-nowrap py-1.5">+ Новая встреча</Link>
        <Link href={`/org/members${q}`} className="chip shrink-0 whitespace-nowrap py-1.5">Участники</Link>
        <Link href={`/org/club${q}`} className="chip shrink-0 whitespace-nowrap py-1.5">Редактировать клуб</Link>
        {isAdmin && <Link href="/admin" className="chip shrink-0 whitespace-nowrap py-1.5">Админ</Link>}
      </nav>
    </header>
  );
}
