/** Name + phone + consent. Shown only when we don't know the visitor yet. */
export function MemberFields({ errors, values }: { errors?: Record<string, string>; values?: Record<string, string> }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="label" htmlFor="name">Ваше имя</label>
        <input id="name" name="name" required minLength={2} maxLength={60} autoComplete="given-name" className="input" placeholder="Айгерим" defaultValue={values?.name} />
        {errors?.name && <p className="err">{errors.name}</p>}
      </div>
      <div>
        <label className="label" htmlFor="phone">Номер WhatsApp</label>
        <input id="phone" name="phone" required type="tel" inputMode="tel" autoComplete="tel" className="input" placeholder="+7 701 123 45 67" defaultValue={values?.phone} />
        {errors?.phone && <p className="err">{errors.phone}</p>}
        <p className="mt-1 text-xs text-muted">Номер видит только организатор — чтобы напомнить о встрече.</p>
      </div>
      <div>
        <label className="label" htmlFor="pin">PIN-код (4–6 цифр)</label>
        <input id="pin" name="pin" required type="password" inputMode="numeric" pattern="[0-9]{4,6}" minLength={4} maxLength={6} autoComplete="current-password" className="input" placeholder="••••" />
        {errors?.pin && <p className="err">{errors.pin}</p>}
        <p className="mt-1 text-xs text-muted">
          Придумайте PIN — с ним вы войдёте с другого телефона или компьютера. Уже участвовали? Введите свой номер и PIN.
        </p>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="consent" required defaultChecked={values?.consent === "on"} className="mt-1 size-4 accent-[var(--brand)]" />
        <span>
          Согласен(на) на обработку персональных данных для участия в клубе.{" "}
          <a href="/privacy" className="underline" target="_blank">Подробнее</a>
        </span>
      </label>
      {errors?.consent && <p className="err">{errors.consent}</p>}
      {/* Honeypot for bots */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
    </div>
  );
}
