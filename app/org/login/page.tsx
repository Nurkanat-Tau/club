import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrgSession } from "@/lib/session";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Вход для организаторов", robots: { index: false } };

export default async function LoginPage() {
  const s = await getOrgSession();
  if (s) redirect(s.isAdmin ? "/admin" : s.club_id ? "/org" : "/new-club");
  return (
    <main className="space-y-6 px-4 pt-12">
      <div>
        <h1 className="text-2xl font-bold">Вход для организаторов</h1>
        <p className="text-muted">
          Нет аккаунта? <Link href="/new-club" className="underline">Создайте клуб</Link>
        </p>
      </div>
      <LoginForm />
      <p className="text-sm text-muted">
        Забыли пароль? Напишите администратору Club — он выдаст временный пароль, который потом можно сменить в разделе «Аккаунт».
      </p>
    </main>
  );
}
