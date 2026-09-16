"use client";
import { useActionState } from "react";
import { createClubAction } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";
import { CATEGORIES } from "@/lib/categories";
import type { FormState } from "@/lib/validation";

export function NewClubForm({ city }: { city: string }) {
  // Count submissions so the <select> remounts with the submitted value after React resets the form.
  type State = (FormState & object) & { n?: number };
  const [state, action] = useActionState<State | null, FormData>(async (prev, fd) => {
    const r = await createClubAction(prev, fd);
    return r ? { ...r, n: (prev?.n ?? 0) + 1 } : null;
  }, null);
  const e = state?.errors ?? {};
  const v = state?.values ?? {};
  const field = (name: string, label: string, opts: { area?: boolean; placeholder?: string; hint?: string; type?: string; required?: boolean; auto?: string } = {}) => (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      {opts.area ? (
        <textarea id={name} name={name} rows={4} className="input" defaultValue={v[name]} placeholder={opts.placeholder} required={opts.required} />
      ) : (
        <input id={name} name={name} type={opts.type ?? "text"} className="input" defaultValue={v[name]} placeholder={opts.placeholder} required={opts.required} autoComplete={opts.auto} />
      )}
      {opts.hint && <p className="mt-1 text-xs text-muted">{opts.hint}</p>}
      {e[name] && <p className="err">{e[name]}</p>}
    </div>
  );

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="city" value={city} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <fieldset className="card space-y-4 p-5">
        <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-muted">Клуб</legend>
        {field("name", "Название клуба", { placeholder: "Шымкент Бег по субботам", required: true })}
        <div>
          <label className="label" htmlFor="category">Категория</label>
          <select key={state?.n ?? 0} id="category" name="category" className="input" defaultValue={v.category ?? ""} required>
            <option value="" disabled>Выберите…</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
            ))}
          </select>
          {e.category && <p className="err">{e.category}</p>}
        </div>
        {field("description", "О клубе", { area: true, required: true, placeholder: "Что вы делаете, для кого, какой уровень, чего ждать новичку" })}
        {field("schedule_text", "Когда встречаетесь", { required: true, placeholder: "Каждую субботу в 08:00" })}
        {field("meeting_point", "Где встречаетесь", { required: true, placeholder: "Дендропарк, центральный вход" })}
        {field("chat_link", "Ссылка на чат WhatsApp / Telegram (необязательно)", { type: "url", placeholder: "https://chat.whatsapp.com/…", hint: "Участники увидят её после вступления" })}
        {field("instagram", "Instagram клуба (необязательно)", { placeholder: "shymkent.run" })}
      </fieldset>

      <fieldset className="card space-y-4 p-5">
        <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-muted">Организатор</legend>
        {field("organizer_name", "Ваше имя", { required: true, auto: "name" })}
        {field("organizer_bio", "Пара слов о себе (необязательно)", { area: true, placeholder: "Бегаю 5 лет, тренер-любитель" })}
        {field("email", "Email для входа", { type: "email", required: true, auto: "email" })}
        {field("password", "Пароль (минимум 8 символов)", { type: "password", required: true, auto: "new-password" })}
      </fieldset>

      {state?.message && <p className="err">{state.message}</p>}
      <SubmitButton pendingText="Создаём…">Создать клуб</SubmitButton>
      <p className="text-center text-xs text-muted">
        Создавая клуб, вы соглашаетесь, что его страница будет публичной, а номера участников вы используете только для
        связи по делам клуба.
      </p>
    </form>
  );
}
