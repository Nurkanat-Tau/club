"use client";
import { useActionState } from "react";
import { memberLoginAction } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";
import { PhoneInput } from "./PhoneInput";

export function MemberLoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(memberLoginAction, null);
  const e = state?.errors ?? {};
  return (
    <form action={action} className="card space-y-4 p-5 text-left">
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <label className="label" htmlFor="login-phone">Номер WhatsApp</label>
        <PhoneInput id="login-phone" defaultValue={state?.values?.phone} />
        {e.phone && <p className="err">{e.phone}</p>}
      </div>
      {state?.message && <p className="err">{state.message}</p>}
      <SubmitButton pendingText="Входим…">Войти</SubmitButton>
    </form>
  );
}
