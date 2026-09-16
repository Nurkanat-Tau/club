import { getManagedClub } from "@/lib/org";
import { OrgNav } from "@/components/OrgNav";
import { EventForm } from "@/components/EventForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Новая встреча", robots: { index: false } };

export default async function NewEvent({ searchParams }: PageProps<"/org/events/new">) {
  const { session, club, q } = await getManagedClub((await searchParams).club);
  return (
    <>
      <OrgNav clubName={club.name} q={q} isAdmin={session.isAdmin} />
      <main className="space-y-4 px-4 pb-12 pt-5">
        <h1 className="text-xl font-bold">Новая встреча</h1>
        <EventForm clubId={club.id} event={{ location_name: club.meeting_point, duration_min: 90 }} />
      </main>
    </>
  );
}
