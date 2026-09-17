"use client";
import { useActionState } from "react";
import { adminResetPasswordAction, adminResetPinAction } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";
import { PhoneInput } from "./PhoneInput";

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

export function AdminResetPinForm() {
  const [state, action] = useActionState(adminResetPinAction, null);
  return (
    <form action={action} className="card space-y-3 p-4">
      <h3 className="font-semibold">Участник забыл PIN</h3>
      <div>
        <label className="label" htmlFor="rpin-phone">Номер участника</label>
        <PhoneInput id="rpin-phone" name="phone" />
      </div>
      {state?.message && <p className={state.ok ? "break-words text-sm font-semibold text-ok" : "err"}>{state.message}</p>}
      <SubmitButton className="btn-ghost w-full">Выдать новый PIN</SubmitButton>
    </form>
  );
}
