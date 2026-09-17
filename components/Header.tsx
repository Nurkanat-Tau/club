import Link from "next/link";
import { getCurrentMember, getOrgSession } from "@/lib/session";
import { DEMO_MODE } from "@/lib/data";

/** Top bar. Adapts to who is looking: guest, member, organizer, admin. */
export async function Header({ city = "Шымкент", back }: { city?: string; back?: { href: string; label: string } }) {
  const [member, org] = await Promise.all([getCurrentMember(), getOrgSession()]);
  return (
    <>
      {DEMO_MODE && (
        <div className="bg-ink px-4 py-1.5 text-center text-xs text-bg">
          Тестовый режим без базы данных: всё введённое сотрётся при перезапуске
        </div>
      )}
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur">
        {back ? (
          <Link href={back.href} className="min-w-0 truncate text-sm font-medium text-muted">
            ← {back.label}
          </Link>
        ) : (
          <Link href="/shymkent" className="flex min-w-0 items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" width={28} height={28} className="rounded-lg" />
            <span className="text-lg font-bold tracking-tight">Club</span>
            <span className="chip">{city}</span>
          </Link>
        )}
        <nav className="flex shrink-0 items-center gap-2 whitespace-nowrap text-sm font-medium">
          {org && (
            <Link href={org.isAdmin ? "/admin" : "/org"} className="rounded-xl border border-line px-3 py-1.5">
              {org.isAdmin ? "Админ" : "Кабинет"}
            </Link>
          )}
          <Link href="/me" className="rounded-xl bg-soft px-3 py-1.5">
            {member ? "Мои встречи" : "Войти"}
          </Link>
        </nav>
      </header>
    </>
  );
}
