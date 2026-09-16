import { redirect } from "next/navigation";
import { DEMO_MODE } from "@/lib/data";
import { getOrgSession } from "@/lib/session";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Вход для организаторов", robots: { index: false } };

export default async function LoginPage() {
  const s = await getOrgSession();
  if (s) redirect(s.club_id ? "/org" : "/admin");
  return (
    <main className="space-y-6 px-4 pt-12">
      <div>
        <h1 className="text-2xl font-bold">Вход для организаторов</h1>
        <p className="text-muted">Доступ выдаёт команда Club. Нет доступа — напишите нам.</p>
      </div>
      <LoginForm demo={DEMO_MODE} />
    </main>
  );
}
