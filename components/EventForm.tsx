"use client";
import { useActionState } from "react";
import { saveEventAction } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";
import type { ClubEvent } from "@/lib/types";

type Defaults = Partial<Omit<ClubEvent, "starts_at">> & { starts_local?: string };

export function EventForm({ event, clubId }: { event?: Defaults; clubId: string }) {
  const [state, action] = useActionState(saveEventAction, null);
  const e = state?.errors ?? {};
  // After a failed submit React resets the form; refill it with what was typed.
  const v = state?.values;
  const d = (k: string, fallback: string | number | null | undefined) => (v ? v[k] : fallback ?? "");
  return (
    <form action={action} className="space-y-4">
      {event?.id && <input type="hidden" name="event_id" value={event.id} />}
      <input type="hidden" name="club_id" value={clubId} />
      <Field label="Название" error={e.title}>
        <input name="title" required maxLength={100} className="input" defaultValue={d("title", event?.title)} placeholder="Субботний забег 5 км" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Дата и время" error={e.starts_at}>
          <input name="starts_at" type="datetime-local" required className="input" defaultValue={d("starts_at", event?.starts_local)} />
        </Field>
        <Field label="Длительность, мин" error={e.duration_min}>
          <input name="duration_min" type="number" min={15} max={1440} required className="input" defaultValue={d("duration_min", event?.duration_min ?? 90)} />
        </Field>
      </div>
      <Field label="Место" error={e.location_name}>
        <input name="location_name" required maxLength={200} className="input" defaultValue={d("location_name", event?.location_name)} placeholder="Дендропарк, центральный вход" />
      </Field>
      <Field label="Ссылка на 2ГИС / карту (необязательно)" error={e.location_url}>
        <input name="location_url" type="url" className="input" defaultValue={d("location_url", event?.location_url)} placeholder="https://2gis.kz/shymkent/..." />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Лимит мест" error={e.capacity}>
          <input name="capacity" type="number" min={1} className="input" defaultValue={d("capacity", event?.capacity)} placeholder="без лимита" />
        </Field>
        <Field label="Стоимость" error={e.price_text}>
          <input name="price_text" maxLength={100} className="input" defaultValue={d("price_text", event?.price_text)} placeholder="бесплатно" />
        </Field>
      </div>
      <Field label="Описание" error={e.description}>
        <textarea name="description" rows={4} maxLength={2000} className="input" defaultValue={d("description", event?.description)} placeholder="Что будет, что взять с собой, для какого уровня" />
      </Field>
      {state?.message && <p className={state.ok ? "text-sm text-ok" : "err"}>{state.message}</p>}
      <SubmitButton>{event?.id ? "Сохранить" : "Создать встречу"}</SubmitButton>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {error && <p className="err">{error}</p>}
    </div>
  );
}
