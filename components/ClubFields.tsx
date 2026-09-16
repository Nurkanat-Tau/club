import { CATEGORIES } from "@/lib/categories";

/** Club fields shared by "create club" and "edit club". `formKey` remounts the <select> after a failed submit. */
export function ClubFields({ values, errors, formKey = 0 }: {
  values: Record<string, string | null | undefined>;
  errors: Record<string, string>;
  formKey?: number;
}) {
  const field = (name: string, label: string, opts: { area?: boolean; placeholder?: string; hint?: string; type?: string; required?: boolean; auto?: string } = {}) => (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      {opts.area ? (
        <textarea id={name} name={name} rows={4} className="input" defaultValue={values[name] ?? ""} placeholder={opts.placeholder} required={opts.required} />
      ) : (
        <input id={name} name={name} type={opts.type ?? "text"} className="input" defaultValue={values[name] ?? ""} placeholder={opts.placeholder} required={opts.required} autoComplete={opts.auto} />
      )}
      {opts.hint && <p className="mt-1 text-xs text-muted">{opts.hint}</p>}
      {errors[name] && <p className="err">{errors[name]}</p>}
    </div>
  );
  return (
    <>
      <fieldset className="card space-y-4 p-5">
        <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-muted">Клуб</legend>
        {field("name", "Название клуба", { placeholder: "Шымкент Бег по субботам", required: true })}
        <div>
          <label className="label" htmlFor="category">Категория</label>
          <select key={formKey} id="category" name="category" className="input" defaultValue={values.category ?? ""} required>
            <option value="" disabled>Выберите…</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
            ))}
          </select>
          {errors.category && <p className="err">{errors.category}</p>}
        </div>
        {field("description", "О клубе", { area: true, required: true, placeholder: "Что вы делаете, для кого, какой уровень, чего ждать новичку" })}
        {field("schedule_text", "Когда встречаетесь", { required: true, placeholder: "Каждую субботу в 08:00" })}
        {field("meeting_point", "Где встречаетесь", { required: true, placeholder: "Дендропарк, центральный вход" })}
        {field("chat_link", "Ссылка на чат WhatsApp / Telegram (необязательно)", { type: "url", placeholder: "https://chat.whatsapp.com/…", hint: "Участники увидят её после вступления" })}
        {field("instagram", "Instagram клуба (необязательно)", { placeholder: "shymkent.run" })}
      </fieldset>
      <fieldset className="card space-y-4 p-5">
        <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-muted">Организатор</legend>
        {field("organizer_name", "Имя организатора", { required: true, auto: "name" })}
        {field("organizer_bio", "Пара слов об организаторе (необязательно)", { area: true, placeholder: "Бегаю 5 лет, тренер-любитель" })}
      </fieldset>
    </>
  );
}
