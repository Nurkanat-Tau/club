import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrgSession } from "@/lib/session";
import { AdminSignupForm } from "@/components/AdminSignupForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Аккаунт администратора", robots: { index: false } };

export default async function AdminStart() {
  const s = await getOrgSession();
  if (s) redirect(s.isAdmin ? "/admin" : "/org");
  return (
    <main className="space-y-6 px-4 pb-12 pt-12">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Аккаунт главного администратора</h1>
        <p className="text-muted">
          Для владельца Club — без своего клуба. Руководители клубов регистрируются сами через{" "}
          <Link href="/new-club" className="underline">«Создать клуб»</Link>.
        </p>
      </div>
      <AdminSignupForm />
      <p className="text-sm text-muted">
        Уже есть аккаунт? <Link href="/org/login" className="underline">Войти</Link>
      </p>
    </main>
  );
}
