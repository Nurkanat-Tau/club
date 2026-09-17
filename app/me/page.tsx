import Link from "next/link";
import { getRepo } from "@/lib/data";
import { getCurrentMember } from "@/lib/session";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MemberLoginForm } from "@/components/MemberLoginForm";
import { EventRow } from "@/components/EventRow";
import { SubmitButton } from "@/components/SubmitButton";
import { ChangePinForm } from "@/components/ChangePinForm";
import { ConfirmButton } from "@/components/ConfirmButton";
import { feedbackAction, forgetMeAction, leaveClubAction } from "@/app/actions";
import { formatDay, isPast } from "@/lib/time";
import { formatPhone } from "@/lib/phone";
import { countLabel, EVENTS } from "@/lib/text";
import { LIMITS } from "@/lib/validation";
import type { Club } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Мои встречи", robots: { index: false } };

export default async function MePage({ searchParams }: PageProps<"/me">) {
  const n = (await searchParams).next;
  const next = typeof n === "string" && n.startsWith("/") && !n.startsWith("//") ? n : undefined;
  const member = await getCurrentMember();
  if (!member) {
    return (
      <>
        <Header />
        <main className="space-y-6 px-4 pb-12 pt-8">
          <section className="space-y-1">
            <h1 className="text-2xl font-bold">Войти</h1>
            <p className="text-muted">Уже вступали в клуб? Введите номер и PIN — ваши клубы и встречи появятся на этом устройстве.</p>
          </section>
          <MemberLoginForm next={next} />
          <section className="card space-y-2 p-5">
            <p className="font-semibold">Ещё не участвовали?</p>
            <p className="text-sm text-muted">Выберите клуб и нажмите «Вступить» — профиль создастся сам.</p>
            <Link href="/shymkent" className="btn-ghost btn-sm">Смотреть клубы</Link>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  const repo = getRepo();
  const [clubs, rsvps, rated] = await Promise.all([
    repo.listMemberClubs(member.id),
    repo.listMemberRsvps(member.id),
    repo.listMemberFeedbackEventIds(member.id),
  ]);
  // Club info for every sign-up (including clubs the member left); hidden clubs are skipped.
  const clubById = new Map<string, Club>(clubs.map((c) => [c.id, c]));
  for (const id of new Set(rsvps.map((r) => r.event.club_id))) {
    if (!clubById.has(id)) {
      const c = await repo.getClubById(id);
      if (c) clubById.set(id, c);
    }
  }
  const visible = rsvps.filter((r) => r.status === "going" && clubById.get(r.event.club_id) && !clubById.get(r.event.club_id)!.hidden);
  const upcoming = visible.filter((r) => !isPast(r.event.starts_at, 60));
  const past = visible.filter((r) => isPast(r.event.starts_at, 60) && r.event.status === "scheduled").reverse();
  const toRate = past.filter((r) => r.attended !== false && !rated.includes(r.event_id)).slice(0, 3);
  const attended = past.filter((r) => r.attended === true).length;

  return (
    <>
      <Header />
      <main className="space-y-8 px-4 pb-12 pt-6">
        <section>
          <h1 className="break-words text-2xl font-bold">{member.name}</h1>
          <p className="text-sm text-muted">
            {formatPhone(member.phone)}
            {attended > 0 && ` · был(а) на ${countLabel(attended, EVENTS)}`}
          </p>
        </section>

        {toRate.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Как прошла встреча?</h2>
            {toRate.map((r) => (
              <form key={r.event_id} action={feedbackAction} className="card space-y-3 p-4">
                <input type="hidden" name="event_id" value={r.event_id} />
                <p className="font-medium">
                  {r.event.title} <span className="text-muted">· {formatDay(r.event.starts_at)}</span>
                </p>
                <fieldset className="flex justify-between gap-1">
                  <legend className="sr-only">Оценка</legend>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <label key={n} className="flex-1">
                      <input type="radio" name="rating" value={n} required className="peer sr-only" />
                      <span className="block cursor-pointer rounded-xl border border-line py-2 text-center text-lg peer-checked:border-brand peer-checked:bg-soft peer-focus-visible:outline-2">
                        <span aria-hidden="true">{["😞", "😕", "😐", "🙂", "🤩"][n - 1]}</span>
                        <span className="sr-only">{n} из 5</span>
                      </span>
                    </label>
                  ))}
                </fieldset>
                <input name="comment" maxLength={LIMITS.comment} className="input" placeholder="Что понравилось, что улучшить? (необязательно)" />
                <p className="text-xs text-muted">Оценку и комментарий увидит организатор клуба.</p>
                <SubmitButton className="btn-ghost btn-sm w-full">Отправить</SubmitButton>
              </form>
            ))}
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Я записан(а)</h2>
          {upcoming.length === 0 ? (
            <p className="card p-4 text-muted">
              Нет предстоящих встреч. <Link href="/shymkent" className="underline">Найти встречу</Link>
            </p>
          ) : (
            upcoming.map((r) => <EventRow key={r.event_id} event={r.event} club={clubById.get(r.event.club_id)} />)
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Мои клубы</h2>
          {clubs.length === 0 ? (
            <p className="card p-4 text-muted">Вы ещё не вступили ни в один клуб.</p>
          ) : (
            <ul className="card divide-y divide-line">
              {clubs.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                  <Link href={`/c/${c.slug}`} className="min-w-0 truncate font-medium">
                    {c.emoji} {c.name}
                  </Link>
                  <form action={leaveClubAction}>
                    <input type="hidden" name="club_id" value={c.id} />
                    <ConfirmButton label="Выйти" confirmLabel="Выйти из клуба" />
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>

        {past.length > 0 && (
          <details className="space-y-3">
            <summary className="cursor-pointer text-lg font-semibold">История · {countLabel(past.length, EVENTS)}</summary>
            <div className="mt-3 space-y-3">
              {past.slice(0, 30).map((r) => (
                <EventRow key={r.event_id} event={r.event} club={clubById.get(r.event.club_id)} badge={r.attended === true ? "был(а)" : undefined} />
              ))}
            </div>
          </details>
        )}

        <ChangePinForm />

        <section className="space-y-2 text-center">
          <p className="text-xs text-muted">На другом устройстве войдите через «Войти» с номером и PIN.</p>
          <form action={forgetMeAction}>
            <SubmitButton className="text-sm text-muted underline">Выйти на этом устройстве</SubmitButton>
          </form>
          <p className="text-xs text-muted">
            Хотите удалить свои данные? <Link href="/privacy" className="underline">Как это сделать</Link>
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
