import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getRepo } from "@/lib/data";
import { unsign } from "@/lib/session";

/** Logs the click, then sends the person to the club's WhatsApp/Telegram chat. */
export async function GET(request: Request, ctx: RouteContext<"/go/chat/[slug]">) {
  const repo = getRepo();
  const found = await repo.getClubBySlug((await ctx.params).slug);
  const club = found && !found.hidden ? found : null;
  if (!club?.chat_link || !/^https?:\/\//.test(club.chat_link)) {
    return NextResponse.redirect(new URL(club ? `/c/${club.slug}` : "/", request.url));
  }
  const jar = await cookies();
  await repo.log({
    type: "click_chat",
    visitor_id: jar.get("club_v")?.value ?? null,
    member_id: unsign(jar.get("club_m")?.value),
    club_id: club.id,
    event_id: null,
  });
  return NextResponse.redirect(club.chat_link);
}
