import Link from "next/link";

export default function NotFound() {
  return (
    <main className="space-y-4 px-4 pt-20 text-center">
      <p className="text-5xl">🧭</p>
      <h1 className="text-2xl font-bold">Страница не найдена</h1>
      <Link href="/shymkent" className="btn-primary">К клубам</Link>
    </main>
  );
}
