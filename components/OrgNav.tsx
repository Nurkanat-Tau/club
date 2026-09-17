import Link from "next/link";
import { logoutAction } from "@/app/actions";

export function OrgNav({ clubName, q, isAdmin, hidden = false }: { clubName: string; q: string; isAdmin: boolean; hidden?: boolean }) {
  const tabs: [string, string][] = [
    [`/org${q}`, "Встречи"],
    [`/org/events/new${q}`, "+ Новая встреча"],
    [`/org/members${q}`, "Участники"],
    [`/org/feedback${q}`, "Отзывы"],
    [`/org/club${q}`, "Клуб"],
    ["/org/account", "Аккаунт"],
  ];
  if (isAdmin) tabs.push(["/admin", "Админ"]);
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase text-muted">Кабинет организатора</div>
          <div className="truncate font-semibold">{clubName}</div>
        </div>
        <form action={logoutAction} className="shrink-0">
          <button className="text-sm text-muted underline">Выйти</button>
        </form>
      </div>
      <nav className="mt-3 flex flex-wrap gap-2 text-sm">
        {tabs.map(([href, label]) => (
          <Link key={href} href={href} className="chip whitespace-nowrap py-1.5">{label}</Link>
        ))}
      </nav>
      {hidden && <p className="mt-2 text-xs font-semibold text-bad">Клуб скрыт администратором и не виден участникам.</p>}
    </header>
  );
}
