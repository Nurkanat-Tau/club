import { redirect } from "next/navigation";
import { getOrgSession } from "@/lib/session";
import { ClaimAdminForm } from "@/components/ClaimAdminForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Права администратора", robots: { index: false } };

export default async function Claim() {
  const s = await getOrgSession();
  if (!s) redirect("/org/login");
  if (s.isAdmin) redirect("/admin");
  return (
    <main className="space-y-4 px-4 pb-12 pt-10">
      <h1 className="text-2xl font-bold">Права администратора</h1>
      <p className="text-muted">
        Введите секретный код из настроек сервера (переменная ADMIN_SETUP_CODE). Код нужен один раз — после этого аккаунт{" "}
        <b className="break-all">{s.email}</b> станет администратором.
      </p>
      <ClaimAdminForm />
    </main>
  );
}
