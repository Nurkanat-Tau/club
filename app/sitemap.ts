import type { MetadataRoute } from "next";
import { getRepo } from "@/lib/data";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/shymkent`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.1 },
  ];
  try {
    const clubs = await getRepo().listClubs("shymkent");
    for (const c of clubs) pages.push({ url: `${SITE_URL}/c/${c.slug}`, changeFrequency: "weekly", priority: 0.8 });
  } catch {
    // The sitemap should never fail just because the database is unavailable.
  }
  return pages;
}
