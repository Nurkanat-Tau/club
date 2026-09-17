"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { joinClubAction, leaveClubAction } from "@/app/actions";
import { MemberFields } from "./MemberFields";
import { SubmitButton } from "./SubmitButton";
import { ConfirmButton } from "./ConfirmButton";

export function JoinForm({ clubId, clubSlug, known, isMember, chatHref, nextEvent }: {
  clubId: string; clubSlug: string; known: boolean; isMember: boolean; chatHref: string | null;
  nextEvent: { id: string; label: string; going?: boolean } | null;
}) {
  const [state, action] = useActionState(joinClubAction, null);
  const [open, setOpen] = useState(false);

  if (isMember || state?.ok) {
    return (
      <div className="card space-y-3 p-4">
        <p className="font-semibold">✅ Вы участник клуба</p>
        {nextEvent && (
          <Link href={`/e/${nextEvent.id}`} className={nextEvent.going ? "btn-ghost w-full" : "btn-primary w-full"}>
            {nextEvent.going ? `✅ Вы записаны: ${nextEvent.label}` : `Записаться: ${nextEvent.label}`}
          </Link>
        )}
        {chatHref ? (
          <>
            <p className="text-sm text-muted">Новости и напоминания — в чате клуба.</p>
            <a href={chatHref} className={nextEvent && !nextEvent.going ? "btn-ghost w-full" : "btn-primary w-full"}>Перейти в чат клуба</a>
          </>
        ) : (
          !nextEvent && <p className="text-sm text-muted">Новых встреч пока нет — организатор скоро добавит.</p>
        )}
        {isMember && (
          <form action={leaveClubAction} className="pt-1">
            <input type="hidden" name="club_id" value={clubId} />
            <ConfirmButton label="Выйти из клуба" confirmLabel="Да, выйти" />
          </form>
        )}
      </div>
    );
  }

  if (!known && !open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-primary w-full">
        Вступить в клуб
      </button>
    );
  }

  return (
    <form action={action} className="card space-y-4 p-4">
      <input type="hidden" name="club_slug" value={clubSlug} />
      <input type="hidden" name="source" value="club_page" />
      {!known && <p className="text-sm text-muted">Уже участвовали? Просто введите тот же номер.</p>}
      {!known && <MemberFields errors={state?.errors} values={state?.values} />}
      {state?.message && !state.ok && <p className="err">{state.message}</p>}
      <SubmitButton>Вступить в клуб</SubmitButton>
    </form>
  );
}
