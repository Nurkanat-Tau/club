"use client";
import { useActionState } from "react";
import { changePinAction } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

export function ChangePinForm() {
  const [state, action] = useActionState(changePinAction, null);
  const e = state?.errors ?? {};
  return (
    <details className="card p-5">
      <summary className="cursor-pointer font-semibold">Сменить PIN</summary>
      <form action={action} className="mt-4 space-y-3">
        <div>
          <label className="label" htmlFor="pin-current">Текущий PIN</label>
          <input id="pin-current" name="current" type="password" inputMode="numeric" maxLength={6} autoComplete="off" required className="input" />
          {e.current && <p className="err">{e.current}</p>}
        </div>
        <div>
          <label className="label" htmlFor="pin-next">Новый PIN (4–6 цифр)</label>
          <input id="pin-next" name="next" type="password" inputMode="numeric" pattern="[0-9]{4,6}" maxLength={6} autoComplete="off" required className="input" />
          {e.next && <p className="err">{e.next}</p>}
        </div>
        {state?.message && <p className={state.ok ? "text-sm font-semibold text-ok" : "err"}>{state.message}</p>}
        <SubmitButton className="btn-ghost w-full">Сохранить PIN</SubmitButton>
      </form>
    </details>
  );
}
