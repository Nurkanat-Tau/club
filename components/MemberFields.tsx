import { PhoneInput } from "./PhoneInput";
import { LIMITS } from "@/lib/validation";

/** Name + phone. Shown only when we don't know the visitor yet. */
export function MemberFields({ errors, values }: { errors?: Record<string, string>; values?: Record<string, string> }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="label" htmlFor="name">Ваше имя</label>
        <input id="name" name="name" maxLength={LIMITS.memberName} autoComplete="given-name" className="input" placeholder="Айгерим" defaultValue={values?.name} />
        {errors?.name && <p className="err">{errors.name}</p>}
      </div>
      <div>
        <label className="label" htmlFor="phone">Номер WhatsApp</label>
        <PhoneInput id="phone" defaultValue={values?.phone} />
        {errors?.phone && <p className="err">{errors.phone}</p>}
      </div>
      <p className="text-xs text-muted">
        Номер видит только организатор — чтобы напомнить о встрече. Продолжая, вы соглашаетесь с{" "}
        <a href="/privacy" className="underline" target="_blank">правилами обработки данных</a>.
      </p>
      {/* Honeypot for bots */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
    </div>
  );
}
