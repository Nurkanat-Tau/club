"use client";
import { useActionState } from "react";
import { adminSignupAction } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

export function AdminSignupForm() {
  const [state, action] = useActionState(adminSignupAction, null);
  const e = state?.errors ?? {};
  return (
    <form action={action} className="card space-y-4 p-5">
      <div>
        <label className="label" htmlFor="admin-email">Ваша почта</label>
        <input id="admin-email" name="email" type="email" required autoComplete="username" className="input" defaultValue={state?.values?.email ?? ""} />
        {e.email && <p className="err">{e.email}</p>}
      </div>
      <div>
        <label className="label" htmlFor="admin-password">Придумайте пароль (минимум 6 символов)</label>
        <input id="admin-password" name="password" type="password" required minLength={6} autoComplete="new-password" className="input" />
        {e.password && <p className="err">{e.password}</p>}
        <p className="mt-1 text-xs text-muted">Запишите его — с ним вы будете входить в «Вход для организаторов».</p>
      </div>
      {state?.message && <p className="err">{state.message}</p>}
      <SubmitButton pendingText="Создаём…">Создать аккаунт администратора</SubmitButton>
    </form>
  );
}
