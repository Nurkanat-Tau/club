"use client";
import { useActionState } from "react";
import { claimAdminAction } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

export function ClaimAdminForm() {
  const [state, action] = useActionState(claimAdminAction, null);
  return (
    <form action={action} className="card space-y-3 p-5">
      <div>
        <label className="label" htmlFor="admin-code">Код администратора</label>
        <input id="admin-code" name="code" type="password" autoComplete="off" required className="input" />
        {state?.errors?.code && <p className="err">{state.errors.code}</p>}
      </div>
      {state?.message && <p className="err">{state.message}</p>}
      <SubmitButton>Активировать</SubmitButton>
    </form>
  );
}
