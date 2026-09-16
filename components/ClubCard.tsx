import Link from "next/link";
import type { Club } from "@/lib/types";

export function ClubCard({ club, members }: { club: Club; members: number }) {
  return (
    <Link href={`/c/${club.slug}`} className="card flex gap-4 p-4 transition hover:border-brand">
      <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-3xl" style={{ background: `${club.color}22` }}>
        {club.emoji}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-semibold">{club.name}</h3>
          {club.is_founding && <span className="chip shrink-0">основатель</span>}
        </div>
        <p className="line-clamp-2 text-sm text-muted">{club.description}</p>
        <p className="mt-1 text-xs text-muted">
          {club.schedule_text} · {members} участн.
        </p>
      </div>
    </Link>
  );
}
