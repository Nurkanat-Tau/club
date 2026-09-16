"use client";
import { useActionState, useState } from "react";
import { rsvpAction } from "@/app/actions";
import { MemberFields } from "./MemberFields";
import { SubmitButton } from "./SubmitButton";

export function RsvpForm({ eventId, known, full }: { eventId: string; known: boolean; full: boolean }) {
  const [state, action] = useActionState(rsvpAction, null);
  const [open, setOpen] = useState(false);

  if (state?.ok) return <p className="card p-4 font-semibold">🎉 {state.message} Организатор напомнит о встрече.</p>;
  if (full) return <p className="card p-4 text-center font-medium text-muted">Мест больше нет</p>;

  if (!known && !open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-primary w-full">
        Я приду
      </button>
    );
  }

  return (
    <form action={action} className="card space-y-4 p-4">
      <input type="hidden" name="event_id" value={eventId} />
      {!known && <MemberFields errors={state?.errors} values={state?.values} />}
      {state?.message && !state.ok && <p className="err">{state.message}</p>}
      <SubmitButton>Я приду</SubmitButton>
    </form>
  );
}
