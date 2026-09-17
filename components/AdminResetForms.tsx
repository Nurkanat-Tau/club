"use client";
import { useActionState } from "react";
import { adminResetPasswordAction } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

export function AdminResetPasswordForm() {
  const [state, action] = useActionState(adminResetPasswordAction, null);
  return (
    <form action={action} className="card space-y-3 p-4">
      <h3 className="font-semibold">Организатор забыл пароль</h3>
      <div>
        <label className="label" htmlFor="rp-email">Email организатора</label>
        <input id="rp-email" name="email" type="email" required className="input" />
      </div>
      {state?.message && <p className={state.ok ? "break-words text-sm font-semibold text-ok" : "err"}>{state.message}</p>}
      <SubmitButton className="btn-ghost w-full">Выдать временный пароль</SubmitButton>
    </form>
  );
}
