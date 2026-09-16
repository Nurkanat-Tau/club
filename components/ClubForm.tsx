"use client";
import { useActionState } from "react";
import { saveClubAction } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";
import type { Club } from "@/lib/types";

export function ClubForm({ club }: { club: Club }) {
  const [state, action] = useActionState(saveClubAction, null);
  const e = state?.errors ?? {};
  const f = (name: keyof Club, label: string, opts: { area?: boolean; placeholder?: string; hint?: string } = {}) => (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      {opts.area ? (
        <textarea id={name} name={name} rows={5} className="input" defaultValue={state?.values?.[name] ?? (club[name] as string) ?? ""} />
      ) : (
        <input id={name} name={name} className="input" defaultValue={state?.values?.[name] ?? (club[name] as string) ?? ""} placeholder={opts.placeholder} />
      )}
      {opts.hint && <p className="mt-1 text-xs text-muted">{opts.hint}</p>}
      {e[name] && <p className="err">{e[name]}</p>}
    </div>
  );
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="club_id" value={club.id} />
      {f("description", "Описание клуба", { area: true })}
      {f("schedule_text", "Расписание", { placeholder: "Каждую субботу в 08:00" })}
      {f("meeting_point", "Место встречи")}
      {f("chat_link", "Ссылка на чат WhatsApp / Telegram", { placeholder: "https://chat.whatsapp.com/...", hint: "Участники увидят её после вступления" })}
      {f("organizer_name", "Имя организатора")}
      {f("organizer_bio", "О себе", { area: true })}
      {f("instagram", "Instagram (без @)", { placeholder: "shymkent.run" })}
      {state?.message && <p className={state.ok ? "text-sm text-ok" : "err"}>{state.message}</p>}
      <SubmitButton>Сохранить</SubmitButton>
    </form>
  );
}
