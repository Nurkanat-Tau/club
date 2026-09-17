import Link from "next/link";
import { redirect } from "next/navigation";
import { getRepo } from "@/lib/data";
import { getOrgSession } from "@/lib/session";
import { computeMetrics } from "@/lib/metrics";
import { logoutAction, setClubHiddenAction } from "@/app/actions";
import { DeleteAllClubsForm } from "@/components/DeleteAllClubsForm";
import { AdminResetPasswordForm } from "@/components/AdminResetForms";
import { FlashCleaner } from "@/components/FlashCleaner";

export const dynamic = "force-dynamic";
export const metadata = { title: "Метрики эксперимента", robots: { index: false } };

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);
const VERDICT = {
  early: { label: "Рано делать выводы", cls: "bg-soft" },
  continue: { label: "Продолжаем", cls: "bg-ok text-white" },
  watch: { label: "Наблюдаем", cls: "bg-soft" },
  change: { label: "Нужно менять", cls: "bg-brand text-brand-ink" },
  stop: { label: "Стоп-сигнал", cls: "bg-bad text-white" },
} as const;

export default async function Admin({ searchParams }: PageProps<"/admin">) {
  const sp = await searchParams;
  const deleted = sp.deleted === "all" ? `Все клубы удалены (${Number(sp.n) || 0}).` : sp.deleted ? "Клуб удалён." : null;
  const s = await getOrgSession();
  if (!s) redirect("/org/login");
  if (!s.isAdmin) redirect("/org");
  const repo = getRepo();
  const [snap, orgs] = await Promise.all([repo.snapshot(), repo.listOrganizers()]);
  const m = computeMetrics(snap); // totals and signal ignore hidden clubs
  // …but the admin still needs hidden clubs in the list, so they can be shown again.
  const clubRows = computeMetrics({ ...snap, clubs: snap.clubs.map((c) => ({ ...c, hidden: false })) }).clubs;
  const hidden = new Set(snap.clubs.filter((c) => c.hidden).map((c) => c.id));
  const t = m.totals;
  const v = VERDICT[m.verdict.level];

  const kpis: [string, string | number, string][] = [
    ["Активные клубы", `${t.activeClubs}/${t.clubs}`, "цель: 5/5"],
    ["Участники", t.members, `+${t.newMembers7d} за 7 дней · цель 150`],
    ["Встреч проведено", t.eventsHeld, `впереди: ${t.eventsUpcoming}`],
    ["Доходимость", pct(t.showRate), `пришли ${t.attended} из ${t.markedRsvps} · цель ≥50%`],
    ["Вернулись (2+)", pct(t.returnRate), `${t.repeatAttendees} из ${t.attendees} · цель ≥30%`],
    ["Активация", pct(t.memberActivation), "участники, пришедшие хоть раз"],
    ["Посетители 7д", t.visitors7d, "уникальные браузеры"],
    ["Активные участники 7д", t.activeMembers7d, "вступили / записались / оценили"],
    ["Конверсия во вступление", pct(t.joinConversion), `из ${t.clubViewers} смотревших клуб`],
    ["В 2+ клубах", pct(t.multiClubRate), `${t.multiClubMembers} чел. · цель ≥10%`],
    ["Оценка встреч", t.avgRating ? t.avgRating.toFixed(1) : "—", `${t.ratings} оценок`],
  ];

  return (
    <main className="space-y-6 px-4 pb-12 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Эксперимент: Шымкент</h1>
        <div className="flex items-center gap-3 text-sm">
          {s.club_id && <Link href="/org" className="underline">Мой клуб</Link>}
          <Link href="/org/account" className="underline">Пароль</Link>
          <form action={logoutAction}><button className="text-muted underline">Выйти</button></form>
        </div>
      </div>

      <FlashCleaner keys={["deleted", "n"]} />
      {deleted && <p className="card p-4 font-semibold">{deleted}</p>}
      <section className={`rounded-3xl p-5 ${v.cls}`}>
        <div className="text-sm font-medium opacity-80">Сигнал</div>
        <div className="text-2xl font-bold">{v.label}</div>
        <ul className="mt-2 list-disc pl-5 text-sm">
          {m.verdict.reasons.map((r) => <li key={r}>{r}</li>)}
        </ul>
      </section>

      {t.unmarkedPastEvents > 0 && (
        <p className="card p-3 text-sm">⚠️ В {t.unmarkedPastEvents} прошедших встречах не отмечено посещение — метрики неполные.</p>
      )}

      <section className="grid grid-cols-2 gap-2">
        {kpis.map(([label, value, sub]) => (
          <div key={label} className="card p-3">
            <div className="text-xs font-medium text-muted">{label}</div>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-[11px] text-muted">{sub}</div>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">По клубам</h2>
        {clubRows.length === 0 && <p className="card p-4 text-muted">Клубов пока нет. Они появятся, когда организаторы создадут их на /new-club.</p>}
        <ul className="grid gap-2 md:grid-cols-2">
          {clubRows.map((c) => (
            <li key={c.clubId} className="card space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/org?club=${c.clubId}`} className="min-w-0 break-words font-semibold underline">{c.emoji} {c.name}</Link>
                {hidden.has(c.clubId) && <span className="chip shrink-0 text-bad">скрыт</span>}
              </div>
              {!c.active && <div className="text-xs text-bad">нет встреч 14 дней</div>}
              <div className="grid grid-cols-4 gap-1 text-center text-xs">
                <div><div className="text-base font-bold">{c.members}</div><div className="text-muted">участн.</div></div>
                <div><div className="text-base font-bold">{c.eventsHeld}<span className="text-muted text-xs">+{c.eventsUpcoming}</span></div><div className="text-muted">встреч</div></div>
                <div><div className="text-base font-bold">{pct(c.showRate)}</div><div className="text-muted">доход.</div></div>
                <div><div className="text-base font-bold">{pct(c.returnRate)}</div><div className="text-muted">возвр.</div></div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted">★ {c.avgRating ? c.avgRating.toFixed(1) : "—"}</span>
                <form action={setClubHiddenAction} className="ml-auto">
                  <input type="hidden" name="club_id" value={c.clubId} />
                  <input type="hidden" name="hidden" value={hidden.has(c.clubId) ? "0" : "1"} />
                  <button className="btn btn-ghost btn-sm">{hidden.has(c.clubId) ? "Показать" : "Скрыть"}</button>
                </form>
                <Link href={`/org/club?club=${c.clubId}`} className="btn btn-ghost btn-sm">Изменить / удалить</Link>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Организаторы ({orgs.length})</h2>
        <ul className="card divide-y divide-line">
          {orgs.map((o) => (
            <li key={o.email} className="flex flex-wrap items-center justify-between gap-1 p-3 text-sm">
              <span className="min-w-0 break-all font-medium">{o.email}{o.is_admin && <span className="chip ml-2">админ</span>}</span>
              <span className="text-muted">{o.club_name ?? "без клуба"}</span>
            </li>
          ))}
          {orgs.length === 0 && <li className="p-3 text-muted">Пока никого.</li>}
        </ul>
      </section>

      <AdminResetPasswordForm />

      {clubRows.length > 0 && <DeleteAllClubsForm count={clubRows.length} />}
      <p className="text-xs text-muted">Обновлено: {new Date(m.generatedAt).toLocaleString("ru-RU", { timeZone: "Asia/Almaty" })}. Пороговые значения — в docs/01-validation.md.</p>
    </main>
  );
}
