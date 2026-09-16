"use client";
import { useActionState } from "react";
import { deleteClubAction } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

export function DeleteClubForm({ clubId, clubName }: { clubId: string; clubName: string }) {
  const [state, action] = useActionState(deleteClubAction, null);
  return (
    <details className="card border-bad p-5">
      <summary className="cursor-pointer font-semibold text-bad">Удалить клуб</summary>
      <form action={action} className="mt-4 space-y-3">
        <input type="hidden" name="club_id" value={clubId} />
        <p className="text-sm">
          Клуб, все его встречи, записи и список участников будут удалены <b>навсегда</b>. Восстановить нельзя.
          Ваш аккаунт организатора останется — вы сможете создать новый клуб.
        </p>
        <label className="label" htmlFor="confirm-delete">
          Чтобы подтвердить, введите название клуба: <b>{clubName}</b>
        </label>
        <input id="confirm-delete" name="confirm" className="input" autoComplete="off" required />
        {state?.errors?.confirm && <p className="err">{state.errors.confirm}</p>}
        {state?.message && <p className="err">{state.message}</p>}
        <SubmitButton className="btn w-full bg-bad text-white" pendingText="Удаляем…">Удалить навсегда</SubmitButton>
      </form>
    </details>
  );
}
