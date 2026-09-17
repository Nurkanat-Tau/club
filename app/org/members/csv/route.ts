import { getRepo } from "@/lib/data";
import { getOrgSession } from "@/lib/session";

const cell = (v: string | number) => {
  const s = String(v);
  // Quote everything; neutralise spreadsheet formulas.
  return `"${(/^[=+\-@]/.test(s) ? "'" + s : s).replace(/"/g, '""')}"`;
};

/** Members of the organizer's club as a CSV file (opens in Excel / Google Sheets). */
export async function GET(request: Request) {
  const s = await getOrgSession();
  if (!s) return new Response("Unauthorized", { status: 401 });
  const wanted = new URL(request.url).searchParams.get("club");
  const clubId = s.isAdmin ? wanted ?? s.club_id : s.club_id;
  if (!clubId) return new Response("Not found", { status: 404 });
  const repo = getRepo();
  const club = await repo.getClubById(clubId);
  if (!club) return new Response("Not found", { status: 404 });
  const members = await repo.listClubMembers(clubId);
  const rows = [
    ["Имя", "Телефон", "Вступил(а)", "Посетил(а) встреч"],
    ...members.map((m) => [m.name, m.phone, m.joined_at.slice(0, 10), m.attended_count]),
  ];
  const body = "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="club-members-${club.slug}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
