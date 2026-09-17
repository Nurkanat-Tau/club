import Link from "next/link";
import type { Club, ClubEvent } from "@/lib/types";
import { formatTime, relativeDay } from "@/lib/time";
import { plural, PLACES } from "@/lib/text";

export function EventRow({ event, club, going, href, badge }: {
  event: ClubEvent; club?: Club; going?: number; href?: string; badge?: string;
}) {
  const cancelled = event.status === "cancelled";
  const left = event.capacity !== null && going !== undefined ? event.capacity - going : null;
  return (
    <Link href={href ?? `/e/${event.id}`} className={`card flex items-center gap-4 p-4 transition hover:border-brand ${cancelled ? "opacity-70" : ""}`}>
      <div className="w-16 shrink-0 text-center">
        <div className="whitespace-nowrap text-[11px] font-medium uppercase text-muted">{relativeDay(event.starts_at, undefined, true)}</div>
        <div className={`text-lg font-bold ${cancelled ? "line-through" : ""}`}>{formatTime(event.starts_at)}</div>
      </div>
      <div className="min-w-0 flex-1">
        {club && (
          <div className="truncate text-xs font-semibold" style={{ color: club.color }}>
            {club.emoji} {club.name}
          </div>
        )}
        <div className="line-clamp-2 break-words font-semibold leading-snug">{event.title}</div>
        <div className="truncate text-sm text-muted">{event.location_name}</div>
        {(cancelled || badge) && (
          <div className="mt-1 flex flex-wrap gap-1">
            {cancelled && <span className="chip bg-bad text-white">Отменена</span>}
            {badge && <span className="chip bg-brand text-brand-ink">{badge}</span>}
          </div>
        )}
      </div>
      {going !== undefined && !cancelled && (
        <div className="shrink-0 text-right text-xs text-muted">
          <div className="text-base font-semibold text-ink">{going}</div>
          {left !== null ? (left > 0 ? `${left} ${plural(left, PLACES)}` : "мест нет") : plural(going, ["идёт", "идут", "идут"])}
        </div>
      )}
    </Link>
  );
}
