import { CATEGORIES } from "@/lib/categories";
import { LIMITS } from "@/lib/validation";

const MAX: Record<string, number> = {
  name: LIMITS.clubName, description: LIMITS.clubDescription, schedule_text: LIMITS.schedule, meeting_point: LIMITS.place,
  chat_link: 500, instagram: 200, organizer_name: LIMITS.organizerName, organizer_bio: LIMITS.organizerBio,
};

/** Club fields shared by "create club" and "edit club". `formKey` remounts the <select> after a failed submit. */
export function ClubFields({ values, errors, formKey = 0, compact = false }: {
  values: Record<string, string | null | undefined>;
  errors: Record<string, string>;
  formKey?: number;
  /** New-club form: optional fields start collapsed. */
  compact?: boolean;
}) {
  const OPTIONAL = ["description", "chat_link", "instagram", "organizer_name", "organizer_bio"];
  const openExtras = !compact || OPTIONAL.some((k) => values[k] || errors[k]);
  const field = (name: string, label: string, opts: { area?: boolean; placeholder?: string; hint?: string; type?: string; required?: boolean; auto?: string } = {}) => (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      {opts.area ? (
        <textarea id={name} name={name} rows={4} maxLength={MAX[name]} className="input" defaultValue={values[name] ?? ""} placeholder={opts.placeholder} required={opts.required} />
      ) : (
        <input id={name} name={name} type={opts.type ?? "text"} maxLength={MAX[name]} className="input" defaultValue={values[name] ?? ""} placeholder={opts.placeholder} required={opts.required} autoComplete={opts.auto} />
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
        {field("schedule_text", "Когда встречаетесь", { required: true, placeholder: "Каждую субботу в 08:00" })}
        {field("meeting_point", "Где встречаетесь", { required: true, placeholder: "Дендропарк, центральный вход" })}
      </fieldset>
      <details className="card p-5" open={openExtras}>
        <summary className="cursor-pointer font-semibold">Ещё о клубе <span className="font-normal text-muted">(необязательно, можно позже)</span></summary>
        <div className="mt-4 space-y-4">
          {field("description", "О клубе", { area: true, placeholder: "Что вы делаете, для кого, чего ждать новичку" })}
          {field("chat_link", "Ссылка на чат WhatsApp / Telegram", { type: "url", placeholder: "https://chat.whatsapp.com/…", hint: "Участники увидят её после вступления" })}
          {field("instagram", "Instagram клуба", { placeholder: "shymkent.run" })}
          {field("organizer_name", "Ваше имя", { auto: "name" })}
          {field("organizer_bio", "Пара слов о вас", { area: true, placeholder: "Бегаю 5 лет, тренер-любитель" })}
        </div>
      </details>
    </>
  );
}
