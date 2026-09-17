import { deleteClubAction } from "@/app/actions";
import { ConfirmButton } from "./ConfirmButton";

export function DeleteClubForm({ clubId }: { clubId: string; clubName?: string }) {
  return (
    <form action={deleteClubAction} className="card space-y-2 p-5">
      <input type="hidden" name="club_id" value={clubId} />
      <p className="text-sm text-muted">Клуб, его встречи и список участников удалятся навсегда. Аккаунт останется.</p>
      <ConfirmButton label="Удалить клуб" confirmLabel="Да, удалить клуб" className="btn btn-sm border border-bad text-bad" />
    </form>
  );
}
