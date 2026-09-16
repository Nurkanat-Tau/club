import Link from "next/link";
import type { Club, ClubEvent } from "@/lib/types";
import { formatTime, relativeDay } from "@/lib/time";

export function EventRow({ event, club, going, href }: { event: ClubEvent; club?: Club; going?: number; href?: string }) {
  const left = event.capacity !== null && going !== undefined ? event.capacity - going : null;
  return (
    <Link href={href ?? `/e/${event.id}`} className="card flex items-center gap-4 p-4 transition hover:border-brand">
      <div className="w-16 shrink-0 text-center">
        <div className="whitespace-nowrap text-[11px] font-medium uppercase text-muted">{relativeDay(event.starts_at, undefined, true)}</div>
        <div className="text-lg font-bold">{formatTime(event.starts_at)}</div>
      </div>
      <div className="min-w-0 flex-1">
        {club && (
          <div className="truncate text-xs font-medium" style={{ color: club.color }}>
            {club.emoji} {club.name}
          </div>
        )}
        <div className="line-clamp-2 font-semibold leading-snug">{event.title}</div>
        <div className="truncate text-sm text-muted">{event.location_name}</div>
      </div>
      {going !== undefined && (
        <div className="shrink-0 text-right text-xs text-muted">
          <div className="font-semibold text-ink">{going}</div>
          {left !== null ? (left > 0 ? `мест: ${left}` : "мест нет") : "идут"}
        </div>
      )}
    </Link>
  );
}
