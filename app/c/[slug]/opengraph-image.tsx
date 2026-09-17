import { ogCard, OG_SIZE } from "@/lib/og";
import { getPublicClubBySlug } from "@/lib/visibility";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Клуб в Club";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const club = await getPublicClubBySlug((await params).slug);
  if (!club) return ogCard({ kicker: "Club", title: "Сообщества Шымкента", lines: [], color: "#ea580c" });
  return ogCard({ kicker: club.category, title: club.name, lines: [club.schedule_text, club.meeting_point], color: club.color });
}
