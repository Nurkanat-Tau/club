"use client";
import { useActionState, useState } from "react";
import { joinClubAction } from "@/app/actions";
import { MemberFields } from "./MemberFields";
import { SubmitButton } from "./SubmitButton";

export function JoinForm({ clubSlug, known, isMember, chatHref }: {
  clubSlug: string; known: boolean; isMember: boolean; chatHref: string | null;
}) {
  const [state, action] = useActionState(joinClubAction, null);
  const [open, setOpen] = useState(false);

  if (isMember || state?.ok) {
    return (
      <div className="card space-y-3 p-4">
        <p className="font-semibold">✅ Вы участник клуба</p>
        {chatHref ? (
          <>
            <p className="text-sm text-muted">Главное общение — в чате клуба. Там напоминания и новости.</p>
            <a href={chatHref} className="btn-primary w-full">Перейти в чат клуба</a>
          </>
        ) : (
          <p className="text-sm text-muted">Запишитесь на ближайшую встречу ниже — организатор напишет вам перед ней.</p>
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
      {!known && <MemberFields errors={state?.errors} values={state?.values} />}
      {state?.message && !state.ok && <p className="err">{state.message}</p>}
      <SubmitButton>Вступить в клуб</SubmitButton>
    </form>
  );
}
