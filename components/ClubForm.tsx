"use client";
import { useActionState } from "react";
import { saveClubAction } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";
import { ClubFields } from "./ClubFields";
import { CATEGORIES } from "@/lib/categories";
import type { Club } from "@/lib/types";
import type { FormState } from "@/lib/validation";

export function ClubForm({ club }: { club: Club }) {
  type State = (FormState & object) & { n?: number };
  const [state, action] = useActionState<State | null, FormData>(async (prev, fd) => {
    const r = await saveClubAction(prev, fd);
    return r ? { ...r, n: (prev?.n ?? 0) + 1 } : null;
  }, null);
  const categoryId = CATEGORIES.find((c) => c.label === club.category)?.id ?? "other";
  const initial: Record<string, string | null> = {
    name: club.name, category: categoryId, description: club.description, schedule_text: club.schedule_text,
    meeting_point: club.meeting_point, chat_link: club.chat_link, instagram: club.instagram,
    organizer_name: club.organizer_name, organizer_bio: club.organizer_bio,
  };
  const v = state?.values ?? initial;
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="club_id" value={club.id} />
      <ClubFields values={v} errors={state?.errors ?? {}} formKey={state?.n ?? 0} />
      {state?.message && <p className={state.ok ? "text-sm font-semibold text-ok" : "err"}>{state.message}</p>}
      <SubmitButton>Сохранить изменения</SubmitButton>
    </form>
  );
}
