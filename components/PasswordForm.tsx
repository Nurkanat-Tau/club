"use client";
import { useActionState } from "react";
import { changePasswordAction } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, null);
  const e = state?.errors ?? {};
  return (
    <form action={action} className="card space-y-3 p-5">
      <h2 className="font-semibold">Сменить пароль</h2>
      <div>
        <label className="label" htmlFor="pw-current">Текущий пароль</label>
        <input id="pw-current" name="current" type="password" autoComplete="current-password" required className="input" />
        {e.current && <p className="err">{e.current}</p>}
      </div>
      <div>
        <label className="label" htmlFor="pw-next">Новый пароль (минимум 6 символов)</label>
        <input id="pw-next" name="next" type="password" autoComplete="new-password" minLength={6} required className="input" />
        {e.next && <p className="err">{e.next}</p>}
      </div>
      {state?.message && <p className={state.ok ? "text-sm font-semibold text-ok" : "err"}>{state.message}</p>}
      <SubmitButton className="btn-ghost w-full">Сохранить пароль</SubmitButton>
    </form>
  );
}
