import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrgSession } from "@/lib/session";
import { getRepo } from "@/lib/data";
import { OrgNav } from "@/components/OrgNav";
import { PasswordForm } from "@/components/PasswordForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Аккаунт", robots: { index: false } };

export default async function Account() {
  const s = await getOrgSession();
  if (!s) redirect("/org/login");
  const club = s.club_id ? await getRepo().getClubById(s.club_id) : null;
  return (
    <>
      <OrgNav clubName={club?.name ?? "Без клуба"} q="" isAdmin={s.isAdmin} hidden={club?.hidden} />
      <main className="space-y-4 px-4 pb-12 pt-5">
        <h1 className="text-xl font-bold">Аккаунт</h1>
        <section className="card space-y-1 p-5 text-sm">
          <p><span className="text-muted">Email:</span> <b className="break-all">{s.email}</b></p>
          <p><span className="text-muted">Имя:</span> {s.name || "—"}</p>
          <p><span className="text-muted">Роль:</span> {s.isAdmin ? "администратор Club" : "организатор"}</p>
          {!club && <Link href="/new-club" className="btn-primary btn-sm mt-2">Создать клуб</Link>}
        </section>
        <PasswordForm />
        <p className="text-sm text-muted">
          Забыли пароль? Администратор Club может выдать временный. Сменить email пока нельзя — напишите администратору.
        </p>
      </main>
    </>
  );
}
