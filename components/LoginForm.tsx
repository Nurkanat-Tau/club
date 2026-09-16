"use client";
import { useActionState } from "react";
import { loginAction } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

export function LoginForm({ demo }: { demo: boolean }) {
  const [state, action] = useActionState(loginAction, null);
  return (
    <form action={action} className="card space-y-4 p-5">
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="username" className="input" defaultValue={state?.values?.email ?? (demo ? "run@club.kz" : "")} />
      </div>
      <div>
        <label className="label" htmlFor="password">Пароль</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="input" defaultValue={demo && !state ? "demo" : ""} />
      </div>
      {state?.message && <p className="err">{state.message}</p>}
      <SubmitButton>Войти</SubmitButton>
      {demo && (
        <p className="text-xs text-muted">
          Демо: run@ / english@ / chess@ / tennis@ / hike@club.kz — организаторы, admin@club.kz — админ. Пароль: demo
        </p>
      )}
    </form>
  );
}
