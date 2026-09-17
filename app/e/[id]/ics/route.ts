import { getRepo } from "@/lib/data";
import { toIcsDate } from "@/lib/time";

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (m) => `\\${m}`);

export async function GET(request: Request, ctx: RouteContext<"/e/[id]/ics">) {
  const repo = getRepo();
  const event = await repo.getEvent((await ctx.params).id);
  if (!event) return new Response("Not found", { status: 404 });
  const club = await repo.getClubById(event.club_id);
  if (!club || club.hidden) return new Response("Not found", { status: 404 });
  const end = new Date(new Date(event.starts_at).getTime() + event.duration_min * 60000).toISOString();
  const url = new URL(`/e/${event.id}`, request.url).toString();
  const body = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Club//RU", "BEGIN:VEVENT",
    `UID:${event.id}@club`, `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
    `DTSTART:${toIcsDate(event.starts_at)}`, `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${esc(`${event.title} (${club.name})`)}`,
    `LOCATION:${esc(event.location_name)}`, `DESCRIPTION:${esc(url)}`, `URL:${url}`,
    "BEGIN:VALARM", "TRIGGER:-PT2H", "ACTION:DISPLAY", "DESCRIPTION:Скоро встреча", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  return new Response(body, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="club-event.ics"` },
  });
}
