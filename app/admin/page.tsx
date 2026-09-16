import Link from "next/link";
import { redirect } from "next/navigation";
import { getRepo } from "@/lib/data";
import { getOrgSession } from "@/lib/session";
import { computeMetrics } from "@/lib/metrics";
import { logoutAction, setClubHiddenAction } from "@/app/actions";
import { DeleteAllClubsForm } from "@/components/DeleteAllClubsForm";

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
  const snap = await getRepo().snapshot();
  const m = computeMetrics(snap);
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Эксперимент: Шымкент</h1>
        <div className="flex items-center gap-3 text-sm">
          {s.club_id ? <Link href="/org" className="underline">Мой клуб</Link> : <Link href="/new-club" className="underline">Создать клуб</Link>}
          <form action={logoutAction}><button className="text-muted underline">Выйти</button></form>
        </div>
      </div>

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
        {m.clubs.length === 0 && <p className="card p-4 text-muted">Клубов пока нет. Они появятся, когда организаторы создадут их на /new-club.</p>}
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="p-3">Клуб</th><th className="p-3">Уч.</th><th className="p-3">Встреч</th>
                <th className="p-3">Доход.</th><th className="p-3">Возвр.</th><th className="p-3">★</th><th className="p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {m.clubs.map((c) => (
                <tr key={c.clubId}>
                  <td className="p-3">
                    <Link href={`/org?club=${c.clubId}`} className="font-medium underline">{c.emoji} {c.name}</Link>
                    {hidden.has(c.clubId) && <div className="text-xs text-bad">скрыт с сайта</div>}
                    {!c.active && <div className="text-xs text-bad">нет встреч 14 дней</div>}
                  </td>
                  <td className="p-3">{c.members}</td>
                  <td className="p-3">{c.eventsHeld}<span className="text-muted">+{c.eventsUpcoming}</span></td>
                  <td className="p-3">{pct(c.showRate)}</td>
                  <td className="p-3">{pct(c.returnRate)}</td>
                  <td className="p-3">{c.avgRating ? c.avgRating.toFixed(1) : "—"}</td>
                  <td className="p-3">
                    <form action={setClubHiddenAction}>
                      <input type="hidden" name="club_id" value={c.clubId} />
                      <input type="hidden" name="hidden" value={hidden.has(c.clubId) ? "0" : "1"} />
                      <button className="text-xs underline">{hidden.has(c.clubId) ? "Показать" : "Скрыть"}</button>
                    </form>
                    <Link href={`/org/club?club=${c.clubId}`} className="text-xs underline">Изменить / удалить</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {m.clubs.length > 0 && <DeleteAllClubsForm count={m.clubs.length} />}
      <p className="text-xs text-muted">Обновлено: {new Date(m.generatedAt).toLocaleString("ru-RU", { timeZone: "Asia/Almaty" })}. Пороговые значения — в docs/01-validation.md.</p>
    </main>
  );
}
