"use client";
import { useActionState } from "react";
import { loginAction } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

export function LoginForm() {
  const [state, action] = useActionState(loginAction, null);
  return (
    <form action={action} className="card space-y-4 p-5">
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="username" className="input" defaultValue={state?.values?.email ?? ""} />
      </div>
      <div>
        <label className="label" htmlFor="password">Пароль</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="input"  />
      </div>
      {state?.message && <p className="err">{state.message}</p>}
      <SubmitButton>Войти</SubmitButton>
    </form>
  );
}
