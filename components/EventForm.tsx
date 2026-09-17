"use client";
import { useActionState } from "react";
import { saveEventAction } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";
import { LIMITS } from "@/lib/validation";
import type { ClubEvent } from "@/lib/types";

type Defaults = Partial<Omit<ClubEvent, "starts_at">> & { starts_local?: string };

const DURATIONS: [number, string][] = [
  [30, "30 минут"], [45, "45 минут"], [60, "1 час"], [90, "1,5 часа"], [120, "2 часа"], [150, "2,5 часа"],
  [180, "3 часа"], [240, "4 часа"], [360, "6 часов"], [480, "8 часов"], [600, "10 часов (весь день)"],
];

export function EventForm({ event, clubId, minDate }: { event?: Defaults; clubId: string; minDate: string }) {
  const [state, action] = useActionState(saveEventAction, null);
  const e = state?.errors ?? {};
  // After a failed submit React resets the form; refill it with what was typed.
  const v = state?.values;
  const d = (k: string, fallback: string | number | null | undefined) => String(v ? v[k] ?? "" : fallback ?? "");
  const [date0, time0] = (event?.starts_local ?? "").split("T");
  const duration = Number(d("duration_min", event?.duration_min ?? 90)) || 90;
  const durations = DURATIONS.some(([m]) => m === duration) ? DURATIONS : [...DURATIONS, [duration, `${duration} минут`] as [number, string]];
  const isNew = !event?.id;
  return (
    <form action={action} className="space-y-4" key={state && !state.ok ? JSON.stringify(v) : "form"}>
      {event?.id && <input type="hidden" name="event_id" value={event.id} />}
      <input type="hidden" name="club_id" value={clubId} />
      <Field label="Название" error={e.title}>
        <input name="title" required minLength={3} maxLength={LIMITS.eventTitle} className="input" defaultValue={d("title", event?.title)} placeholder="Субботний забег 5 км" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Дата" error={e.starts_at}>
          <input name="date" type="date" required min={isNew ? minDate : undefined} className="input" defaultValue={d("date", date0)} />
        </Field>
        <Field label="Начало">
          <input name="time" type="time" required step={300} className="input" defaultValue={d("time", time0 ?? "19:00")} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Длительность" error={e.duration_min}>
          <select name="duration_min" className="input" defaultValue={String(duration)}>
            {durations.map(([m, label]) => (
              <option key={m} value={m}>{label}</option>
            ))}
          </select>
        </Field>
        <Field label="Лимит мест" error={e.capacity}>
          <input name="capacity" type="number" min={1} max={10000} inputMode="numeric" className="input" defaultValue={d("capacity", event?.capacity)} placeholder="без лимита" />
        </Field>
      </div>
      <Field label="Место" error={e.location_name}>
        <input name="location_name" required maxLength={LIMITS.place} className="input" defaultValue={d("location_name", event?.location_name)} placeholder="Дендропарк, центральный вход" />
      </Field>
      <Field label="Ссылка на 2ГИС / карту (необязательно)" error={e.location_url} hint="Если не указать, участникам покажем поиск места в 2ГИС.">
        <input name="location_url" type="url" maxLength={500} className="input" defaultValue={d("location_url", event?.location_url)} placeholder="https://2gis.kz/shymkent/..." />
      </Field>
      <Field label="Стоимость" error={e.price_text} hint="Пусто — бесплатно. Число станет суммой в тенге: 2000 → 2 000 ₸.">
        <input name="price_text" maxLength={LIMITS.price} className="input" defaultValue={d("price_text", event?.price_text)} placeholder="Бесплатно" />
      </Field>
      <Field label="Описание" error={e.description} hint="Что будет, для какого уровня, что взять с собой. Ссылки станут кликабельными.">
        <textarea name="description" rows={4} maxLength={LIMITS.eventDescription} className="input" defaultValue={d("description", event?.description)} />
      </Field>
      {isNew && (
        <Field label="Повторять каждую неделю">
          <select name="repeat" className="input" defaultValue={d("repeat", "0")}>
            <option value="0">Нет, одна встреча</option>
            {[3, 4, 8, 12].map((n) => (
              <option key={n} value={n}>Ещё {n} недель (всего {n + 1})</option>
            ))}
          </select>
        </Field>
      )}
      {state?.message && <p className={state.ok ? "text-sm font-semibold text-ok" : "err"}>{state.message}</p>}
      <SubmitButton>{isNew ? "Создать встречу" : "Сохранить"}</SubmitButton>
    </form>
  );
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="err">{error}</p>}
    </div>
  );
}
