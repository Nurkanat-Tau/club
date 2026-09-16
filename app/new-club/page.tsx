import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrgSession } from "@/lib/session";
import { Header } from "@/components/Header";
import { NewClubForm } from "@/components/NewClubForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Создать клуб" };

export default async function NewClubPage({ searchParams }: PageProps<"/new-club">) {
  const session = await getOrgSession();
  if (session?.club_id && !session.isAdmin) redirect("/org");
  const deleted = !!(await searchParams).deleted;
  const signedInAs = session && !session.club_id ? { email: session.email, name: session.name } : undefined;
  return (
    <>
      <Header back={{ href: "/shymkent", label: "Клубы" }} />
      <main className="space-y-6 px-4 pb-16 pt-6">
        {deleted && <p className="card p-4 font-semibold">Клуб удалён.</p>}
        <section>
          <h1 className="text-2xl font-bold tracking-tight">Создайте клуб в Шымкенте</h1>
          <p className="mt-1 text-muted">
            Страница клуба, запись на встречи, список участников и отметка посещений. Бесплатно.
          </p>
          {!session && (
            <p className="mt-2 text-sm">
              Уже есть клуб? <Link href="/org/login" className="underline">Войти</Link>
            </p>
          )}
        </section>
        <NewClubForm city="shymkent" signedInAs={signedInAs} />
      </main>
    </>
  );
}
