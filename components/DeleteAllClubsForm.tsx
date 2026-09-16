"use client";
import { useActionState } from "react";
import { deleteAllClubsAction } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

export function DeleteAllClubsForm({ count }: { count: number }) {
  const [state, action] = useActionState(deleteAllClubsAction, null);
  return (
    <details className="card border-bad p-5">
      <summary className="cursor-pointer font-semibold text-bad">Удалить все клубы ({count})</summary>
      <form action={action} className="mt-4 space-y-3">
        <p className="text-sm">
          Будут навсегда удалены <b>все клубы</b>, их встречи, записи и участники клубов. Профили участников и аккаунты
          организаторов останутся. Отменить нельзя.
        </p>
        <label className="label" htmlFor="confirm-all">Введите <b>УДАЛИТЬ ВСЁ</b></label>
        <input id="confirm-all" name="confirm" className="input" autoComplete="off" required />
        {state?.errors?.confirm && <p className="err">{state.errors.confirm}</p>}
        <SubmitButton className="btn w-full bg-bad text-white" pendingText="Удаляем…">Удалить все клубы</SubmitButton>
      </form>
    </details>
  );
}
