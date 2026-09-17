"use client";
import { useActionState } from "react";
import { addWalkInAction } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";
import { PhoneInput } from "./PhoneInput";

/** Add someone who came without signing up (keeps attendance numbers honest). */
export function WalkInForm({ eventId }: { eventId: string }) {
  const [state, action] = useActionState(addWalkInAction, null);
  const e = state?.errors ?? {};
  return (
    <details className="card p-4">
      <summary className="cursor-pointer font-semibold">+ Добавить пришедшего без записи</summary>
      <form action={action} className="mt-3 space-y-3" key={state?.ok ? state.message : "walkin"}>
        <input type="hidden" name="event_id" value={eventId} />
        <div>
          <label className="label" htmlFor="walkin-name">Имя</label>
          <input id="walkin-name" name="name" required minLength={2} maxLength={60} className="input" />
          {e.name && <p className="err">{e.name}</p>}
        </div>
        <div>
          <label className="label" htmlFor="walkin-phone">Номер WhatsApp</label>
          <PhoneInput id="walkin-phone" />
          {e.phone && <p className="err">{e.phone}</p>}
        </div>
        {state?.message && <p className={state.ok ? "text-sm font-semibold text-ok" : "err"}>{state.message}</p>}
        <SubmitButton className="btn-ghost w-full">Отметить как пришедшего</SubmitButton>
      </form>
    </details>
  );
}
