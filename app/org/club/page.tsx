import { getManagedClub } from "@/lib/org";
import { OrgNav } from "@/components/OrgNav";
import { ClubForm } from "@/components/ClubForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Настройки клуба", robots: { index: false } };

export default async function ClubSettings({ searchParams }: PageProps<"/org/club">) {
  const { session, club, q } = await getManagedClub((await searchParams).club);
  return (
    <>
      <OrgNav clubName={club.name} q={q} isAdmin={session.isAdmin} />
      <main className="space-y-4 px-4 pb-12 pt-5">
        <h1 className="text-xl font-bold">Клуб</h1>
        <ClubForm club={club} />
      </main>
    </>
  );
}
