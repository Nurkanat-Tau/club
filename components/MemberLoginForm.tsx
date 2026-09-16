"use client";
import { useActionState } from "react";
import { memberLoginAction } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

export function MemberLoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(memberLoginAction, null);
  const e = state?.errors ?? {};
  return (
    <form action={action} className="card space-y-4 p-5 text-left">
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <label className="label" htmlFor="login-phone">Номер WhatsApp</label>
        <input id="login-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required className="input" placeholder="+7 701 123 45 67" defaultValue={state?.values?.phone} />
        {e.phone && <p className="err">{e.phone}</p>}
      </div>
      <div>
        <label className="label" htmlFor="login-pin">PIN-код</label>
        <input id="login-pin" name="pin" type="password" inputMode="numeric" pattern="[0-9]{4,6}" autoComplete="current-password" required className="input" placeholder="••••" />
        {e.pin && <p className="err">{e.pin}</p>}
      </div>
      <SubmitButton pendingText="Входим…">Войти</SubmitButton>
      <p className="text-xs text-muted">PIN вы придумали, когда впервые вступили в клуб или записались на встречу.</p>
    </form>
  );
}
