import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/for-chambers`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/for-chambers/pricing`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/community`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${baseUrl}/chambers`, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/events`, changeFrequency: "daily", priority: 0.8 },
  ];

  const [chambers, publicEvents, publicArticles] = await Promise.all([
    prisma.chamber
      .findMany({
        where: { status: "ACTIVE" },
        select: { slug: true, updatedAt: true },
      })
      .catch(() => []),
    prisma.event
      .findMany({
        where: { visibility: "PUBLIC", status: "PUBLISHED" },
        include: { chamber: { select: { slug: true } } },
      })
      .catch(() => []),
    prisma.knowledgeArticle
      .findMany({
        where: { isPublic: true },
        include: { chamber: { select: { slug: true } } },
      })
      .catch(() => []),
  ]);

  const dynamicEntries: MetadataRoute.Sitemap = [
    ...chambers.map((c) => ({
      url: `${baseUrl}/c/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...publicEvents.map((e) => ({
      url: `${baseUrl}/c/${e.chamber.slug}/events/${e.slug}`,
      lastModified: e.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...publicArticles.map((a) => ({
      url: `${baseUrl}/c/${a.chamber.slug}/knowledge/${a.slug}`,
      lastModified: a.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];

  return [...staticEntries, ...dynamicEntries];
}
