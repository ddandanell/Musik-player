import Link from "next/link";
import type { Metadata } from "next";
import { Calendar, FileText, Users, Building2 } from "lucide-react";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Network activity · DanChamp",
  description: "Live activity across every chamber on the platform.",
};

type ActivityItem = {
  kind: "event" | "article" | "member" | "chamber";
  chamberSlug: string;
  chamberName: string;
  brandColor: string;
  title: string;
  detail?: string;
  href: string;
  at: Date;
};

export default async function ActivityFeed() {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [events, articles, members, chambers] = await Promise.all([
    prisma.event.findMany({
      where: { status: "PUBLISHED", createdAt: { gte: since } },
      include: { chamber: { select: { slug: true, name: true, brandColor: true } } },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    prisma.knowledgeArticle.findMany({
      where: { isPublic: true, createdAt: { gte: since } },
      include: { chamber: { select: { slug: true, name: true, brandColor: true } } },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.membership.findMany({
      where: { status: "ACTIVE", joinedAt: { gte: since } },
      include: {
        chamber: { select: { slug: true, name: true, brandColor: true } },
        user: { select: { name: true, email: true } },
      },
      orderBy: { joinedAt: "desc" },
      take: 30,
    }),
    prisma.chamber.findMany({
      where: { status: "ACTIVE", createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const items: ActivityItem[] = [
    ...events.map<ActivityItem>((e) => ({
      kind: "event",
      chamberSlug: e.chamber.slug,
      chamberName: e.chamber.name,
      brandColor: e.chamber.brandColor,
      title: `New event: ${e.title}`,
      detail: e.location ?? undefined,
      href: e.visibility === "PUBLIC"
        ? `/c/${e.chamber.slug}/events/${e.slug}`
        : `/c/${e.chamber.slug}/events`,
      at: e.createdAt,
    })),
    ...articles.map<ActivityItem>((a) => ({
      kind: "article",
      chamberSlug: a.chamber.slug,
      chamberName: a.chamber.name,
      brandColor: a.chamber.brandColor,
      title: `New article: ${a.title}`,
      detail: a.excerpt ?? undefined,
      href: `/c/${a.chamber.slug}/knowledge/${a.slug}`,
      at: a.createdAt,
    })),
    ...members.map<ActivityItem>((m) => ({
      kind: "member",
      chamberSlug: m.chamber.slug,
      chamberName: m.chamber.name,
      brandColor: m.chamber.brandColor,
      title: `${m.user.name ?? m.user.email} joined`,
      detail: m.role.replaceAll("_", " ").toLowerCase(),
      href: `/c/${m.chamber.slug}`,
      at: m.joinedAt,
    })),
    ...chambers.map<ActivityItem>((c) => ({
      kind: "chamber",
      chamberSlug: c.slug,
      chamberName: c.name,
      brandColor: c.brandColor,
      title: `${c.name} joined the network`,
      detail: c.country,
      href: `/c/${c.slug}`,
      at: c.createdAt,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <header>
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-accent)]">
          Live network
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-[clamp(2.5rem,1rem+4vw,4.5rem)] tracking-tight leading-[1]">
          Activity across DanChamp
        </h1>
        <p className="mt-4 text-[var(--color-ink-muted)]">
          Every chamber publishing an event, posting an article, or welcoming a new member
          surfaces here. Last 30 days, all chambers, public-safe entries only.
        </p>
      </header>

      <ul className="mt-12 space-y-1">
        {items.length === 0 && (
          <li className="text-sm text-[var(--color-ink-muted)]">
            Nothing to show yet. Run <code>pnpm db:seed</code> to load demo data.
          </li>
        )}

        {items.map((item, idx) => (
          <li
            key={`${item.kind}-${idx}`}
            className="flex items-start gap-4 py-5 border-b border-[var(--color-line)] last:border-0"
          >
            <span
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-card)] text-[var(--color-surface)]"
              style={{ background: item.brandColor }}
              aria-hidden="true"
            >
              <Glyph kind={item.kind} />
            </span>

            <div className="flex-1 min-w-0">
              <Link href={item.href} className="font-medium hover:underline">
                {item.title}
              </Link>
              <p className="text-xs text-[var(--color-ink-muted)] mt-1 inline-flex items-center gap-2 flex-wrap">
                <span style={{ color: item.brandColor }}>{item.chamberName}</span>
                {item.detail && (
                  <>
                    <span>·</span>
                    <span>{item.detail}</span>
                  </>
                )}
                <span>·</span>
                <time>{relativeTime(item.at)}</time>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Glyph({ kind }: { kind: ActivityItem["kind"] }) {
  if (kind === "event") return <Calendar size={16} strokeWidth={1.7} />;
  if (kind === "article") return <FileText size={16} strokeWidth={1.7} />;
  if (kind === "member") return <Users size={16} strokeWidth={1.7} />;
  return <Building2 size={16} strokeWidth={1.7} />;
}

function relativeTime(d: Date): string {
  const diffMs = Date.now() - d.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
