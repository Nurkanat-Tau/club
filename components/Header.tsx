import Link from "next/link";

export function Header({ city = "Шымкент", back }: { city?: string; back?: { href: string; label: string } }) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur">
      {back ? (
        <Link href={back.href} className="text-sm font-medium text-muted">
          ← {back.label}
        </Link>
      ) : (
        <Link href="/shymkent" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" width={28} height={28} className="rounded-lg" />
          <span className="text-lg font-bold tracking-tight">Club</span>
          <span className="chip">{city}</span>
        </Link>
      )}
      <nav className="flex items-center gap-3 text-sm font-medium">
        <Link href="/me" className="rounded-xl bg-soft px-3 py-1.5">Мои встречи</Link>
      </nav>
    </header>
  );
}
