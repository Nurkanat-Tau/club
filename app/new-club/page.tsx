import Link from "next/link";
import { Header } from "@/components/Header";
import { NewClubForm } from "@/components/NewClubForm";

export const metadata = { title: "Создать клуб" };

export default function NewClubPage() {
  return (
    <>
      <Header back={{ href: "/shymkent", label: "Клубы" }} />
      <main className="space-y-6 px-4 pb-16 pt-6">
        <section>
          <h1 className="text-2xl font-bold tracking-tight">Создайте клуб в Шымкенте</h1>
          <p className="mt-1 text-muted">
            Страница клуба, запись на встречи, список участников и отметка посещений. Бесплатно.
          </p>
          <p className="mt-2 text-sm">
            Уже есть клуб? <Link href="/org/login" className="underline">Войти</Link>
          </p>
        </section>
        <NewClubForm city="shymkent" />
      </main>
    </>
  );
}
