import Link from "next/link";
import { CITIES } from "@/lib/cities";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col px-5 pb-10 pt-12">
      <div className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" width={40} height={40} className="rounded-xl" />
        <span className="text-2xl font-bold tracking-tight">Club</span>
      </div>
      <h1 className="mt-10 text-4xl font-bold leading-tight tracking-tight">
        Найди своих людей <span className="text-brand">в своём городе</span>
      </h1>
      <p className="mt-4 text-lg text-muted">
        Бег, английский, шахматы, теннис, походы. Живые встречи каждую неделю — просто приходи.
      </p>
      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-muted">Выберите город</h2>
      <div className="mt-3 grid gap-3">
        {CITIES.map((c) =>
          c.active ? (
            <Link key={c.slug} href={`/${c.slug}`} className="btn-primary justify-between text-lg">
              {c.name} <span>→</span>
            </Link>
          ) : (
            <div key={c.slug} className="btn-ghost justify-between text-lg opacity-60">
              {c.name} <span className="text-sm font-normal">скоро</span>
            </div>
          ),
        )}
      </div>
      <div className="mt-auto pt-12 text-center text-sm text-muted">
        Организуете сообщество? <Link href="/org/login" className="underline">Вход для организаторов</Link>
      </div>
    </main>
  );
}
