"use client";
import { useState } from "react";
import { SubmitButton } from "./SubmitButton";

/** Two-step button: first tap asks "Точно?", second tap submits the surrounding form. */
export function ConfirmButton({ label, confirmLabel = "Да, точно", className = "text-sm text-muted underline" }: {
  label: string; confirmLabel?: string; className?: string;
}) {
  const [asking, setAsking] = useState(false);
  if (!asking)
    return (
      <button type="button" className={className} onClick={() => setAsking(true)}>
        {label}
      </button>
    );
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <SubmitButton className="btn btn-sm bg-bad text-white">{confirmLabel}</SubmitButton>
      <button type="button" className="text-sm text-muted underline" onClick={() => setAsking(false)}>Отмена</button>
    </span>
  );
}
