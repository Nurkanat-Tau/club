import Link from "next/link";
import { getRepo } from "@/lib/data";
import { getCurrentMember } from "@/lib/session";
import { Header } from "@/components/Header";
import { EventRow } from "@/components/EventRow";
import { SubmitButton } from "@/components/SubmitButton";
import { feedbackAction, forgetMeAction } from "@/app/actions";
import { formatDay } from "@/lib/time";
import { formatPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";
export const metadata = { title: "Мои встречи" };

export default async function MePage() {
  const member = await getCurrentMember();
  if (!member) {
    return (
      <>
        <Header />
        <main className="space-y-4 px-4 pt-10 text-center">
          <p className="text-5xl">👋</p>
          <h1 className="text-2xl font-bold">Вы пока не записаны</h1>
          <p className="text-muted">Вступите в клуб или запишитесь на встречу — они появятся здесь.</p>
          <Link href="/shymkent" className="btn-primary">Смотреть клубы</Link>
        </main>
      </>
    );
  }
  const repo = getRepo();
  const [clubs, rsvps, rated] = await Promise.all([
    repo.listMemberClubs(member.id),
    repo.listMemberRsvps(member.id),
    repo.listMemberFeedbackEventIds(member.id),
  ]);
  const now = new Date().toISOString();
  const going = rsvps.filter((r) => r.status === "going" && r.event.status === "scheduled");
  const upcoming = going.filter((r) => r.event.starts_at >= now);
  const toRate = going.filter((r) => r.event.starts_at < now && r.attended !== false && !rated.includes(r.event_id)).slice(-3);

  return (
    <>
      <Header />
      <main className="space-y-8 px-4 pb-12 pt-6">
        <section>
          <h1 className="text-2xl font-bold">{member.name}</h1>
          <p className="text-sm text-muted">{formatPhone(member.phone)}</p>
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
                <div className="flex justify-between gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <label key={n} className="flex-1">
                      <input type="radio" name="rating" value={n} required className="peer sr-only" />
                      <span className="block cursor-pointer rounded-xl border border-line py-2 text-center text-lg peer-checked:border-brand peer-checked:bg-soft">
                        {["😞", "😕", "😐", "🙂", "🤩"][n - 1]}
                      </span>
                    </label>
                  ))}
                </div>
                <input name="comment" maxLength={1000} className="input" placeholder="Что улучшить? (необязательно)" />
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
            upcoming.map((r) => <EventRow key={r.event_id} event={r.event} club={clubs.find((c) => c.id === r.event.club_id)} />)
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Мои клубы</h2>
          {clubs.length === 0 ? (
            <p className="card p-4 text-muted">Вы ещё не вступили ни в один клуб.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {clubs.map((c) => (
                <Link key={c.id} href={`/c/${c.slug}`} className="chip py-2 text-sm">
                  {c.emoji} {c.name}
                </Link>
              ))}
            </div>
          )}
        </section>

        <form action={forgetMeAction} className="pt-4 text-center">
          <SubmitButton className="text-sm text-muted underline">Выйти на этом устройстве</SubmitButton>
        </form>
      </main>
    </>
  );
}
