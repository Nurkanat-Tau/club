import { ogCard, OG_SIZE } from "@/lib/og";
import { getRepo } from "@/lib/data";
import { formatDay, formatTime } from "@/lib/time";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Встреча в Club";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const repo = getRepo();
  const ev = await repo.getEvent((await params).id);
  const club = ev ? await repo.getClubById(ev.club_id) : null;
  if (!ev || !club || club.hidden) return ogCard({ kicker: "Club", title: "Сообщества Шымкента", lines: [], color: "#ea580c" });
  return ogCard({
    kicker: club.name,
    title: ev.status === "cancelled" ? `Отменена: ${ev.title}` : ev.title,
    lines: [`${formatDay(ev.starts_at)}, ${formatTime(ev.starts_at)}`, ev.location_name, ev.price_text ?? "Бесплатно"],
    color: club.color,
  });
}
