"use client";
import { useActionState } from "react";
import { createClubAction } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";
import { ClubFields } from "./ClubFields";
import type { FormState } from "@/lib/validation";

export function NewClubForm({ city, signedInAs }: { city: string; signedInAs?: { email: string; name: string } }) {
  // Count submissions so the <select> remounts with the submitted value after React resets the form.
  type State = (FormState & object) & { n?: number };
  const [state, action] = useActionState<State | null, FormData>(async (prev, fd) => {
    const r = await createClubAction(prev, fd);
    return r ? { ...r, n: (prev?.n ?? 0) + 1 } : null;
  }, null);
  const e = state?.errors ?? {};
  const v: Record<string, string> = state?.values ?? (signedInAs ? { organizer_name: signedInAs.name } : {});

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="city" value={city} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <ClubFields values={v} errors={e} formKey={state?.n ?? 0} />

      {signedInAs ? (
        <p className="card p-4 text-sm">Клуб будет привязан к вашему аккаунту <b>{signedInAs.email}</b>.</p>
      ) : (
        <fieldset className="card space-y-4 p-5">
          <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-muted">Вход в кабинет</legend>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" className="input" defaultValue={v.email} />
            {e.email && <p className="err">{e.email}</p>}
          </div>
          <div>
            <label className="label" htmlFor="password">Пароль (минимум 8 символов)</label>
            <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="input" />
            {e.password && <p className="err">{e.password}</p>}
            <p className="mt-1 text-xs text-muted">Удаляли свой клуб раньше? Введите тот же email и пароль.</p>
          </div>
        </fieldset>
      )}

      {state?.message && <p className="err">{state.message}</p>}
      <SubmitButton pendingText="Создаём…">Создать клуб</SubmitButton>
      <p className="text-center text-xs text-muted">
        Создавая клуб, вы соглашаетесь, что его страница будет публичной, а номера участников вы используете только для
        связи по делам клуба.
      </p>
    </form>
  );
}
