import { deleteAllClubsAction } from "@/app/actions";
import { ConfirmButton } from "./ConfirmButton";

export function DeleteAllClubsForm({ count }: { count: number }) {
  return (
    <form action={deleteAllClubsAction} className="card space-y-2 p-5">
      <p className="text-sm text-muted">Удалятся все клубы, их встречи и списки участников. Профили людей и аккаунты останутся.</p>
      <ConfirmButton label={`Удалить все клубы (${count})`} confirmLabel="Да, удалить все" className="btn btn-sm border border-bad text-bad" />
    </form>
  );
}
