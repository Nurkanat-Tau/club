import { notFound } from "next/navigation";
import { getCity } from "@/lib/cities";

/** Checked here (above loading.tsx) so unknown cities get a real 404 status. */
export default async function CityLayout({ children, params }: LayoutProps<"/[city]">) {
  if (!getCity((await params).city)) notFound();
  return children;
}
