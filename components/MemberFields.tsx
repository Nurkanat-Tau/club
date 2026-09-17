"use client";
import { useState } from "react";
import { PhoneInput } from "./PhoneInput";
import { LIMITS } from "@/lib/validation";

/** Phone + PIN (+ name for first-timers) + consent. Shown only when we don't know the visitor yet. */
export function MemberFields({ errors, values }: { errors?: Record<string, string>; values?: Record<string, string> }) {
  const [showPin, setShowPin] = useState(false);
  return (
    <div className="space-y-3">
      <div>
        <label className="label" htmlFor="phone">Номер WhatsApp</label>
        <PhoneInput id="phone" defaultValue={values?.phone} />
        {errors?.phone && <p className="err">{errors.phone}</p>}
        <p className="mt-1 text-xs text-muted">Номер видит только организатор — чтобы напомнить о встрече.</p>
      </div>
      <div>
        <label className="label" htmlFor="pin">PIN-код (4–6 цифр)</label>
        <div className="flex gap-2">
          <input
            id="pin" name="pin" required type={showPin ? "text" : "password"} inputMode="numeric" pattern="[0-9]{4,6}"
            minLength={4} maxLength={6} autoComplete="off" className="input" placeholder="••••"
          />
          <button type="button" className="btn-ghost btn-sm shrink-0" onClick={() => setShowPin((v) => !v)} aria-label={showPin ? "Скрыть PIN" : "Показать PIN"}>
            {showPin ? "Скрыть" : "Показать"}
          </button>
        </div>
        {errors?.pin && <p className="err">{errors.pin}</p>}
        <p className="mt-1 text-xs text-muted">
          Впервые здесь — придумайте PIN, с ним вы войдёте с любого устройства. Уже участвовали — введите свой.
        </p>
      </div>
      <div>
        <label className="label" htmlFor="name">
          Ваше имя <span className="font-normal text-muted">(нужно только в первый раз)</span>
        </label>
        <input id="name" name="name" maxLength={LIMITS.memberName} autoComplete="given-name" className="input" placeholder="Айгерим" defaultValue={values?.name} />
        {errors?.name && <p className="err">{errors.name}</p>}
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
