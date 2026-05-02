import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MapPin, MessageCircle, ArrowUpRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { chamberRoleFor } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ chamberSlug: string; userId: string }>;
}) {
  const { chamberSlug, userId } = await params;
  const session = await requireSession();

  const chamber = await prisma.chamber.findUnique({
    where: { slug: chamberSlug },
    select: { id: true, name: true, brandColor: true },
  });
  if (!chamber) notFound();

  if (!chamberRoleFor(session, chamber.id)) {
    redirect(`/c/${chamberSlug}`);
  }

  const membership = await prisma.membership.findFirst({
    where: { userId, chamberId: chamber.id, status: "ACTIVE" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          headline: true,
          bio: true,
          location: true,
          avatarUrl: true,
          createdAt: true,
        },
      },
      tier: { select: { name: true } },
      company: { select: { id: true, name: true } },
    },
  });
  if (!membership) notFound();

  const [tickets, posts, listings] = await Promise.all([
    prisma.ticket.findMany({
      where: {
        userId,
        status: { in: ["PAID", "RESERVED", "CHECKED_IN"] },
        event: { chamberId: chamber.id },
      },
      include: { event: { select: { id: true, slug: true, title: true, startsAt: true, coverImageUrl: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.forumPost.findMany({
      where: { authorId: userId, thread: { chamberId: chamber.id } },
      include: { thread: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.marketplaceListing.findMany({
      where: { sellerUserId: userId, chamberId: chamber.id },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
  ]);

  const isSelf = membership.user.id === session.userId;

  return (
    <section className="mx-auto max-w-4xl px-6 py-12">
      <Link
        href={`/c/${chamberSlug}/directory`}
        className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
      >
        ← Back to directory
      </Link>

      <header className="mt-6 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-8 flex flex-wrap items-start gap-6">
        <div className="relative h-24 w-24 shrink-0 rounded-[var(--radius-card)] overflow-hidden border border-[var(--color-line)] bg-[var(--color-surface)] flex items-center justify-center">
          {membership.user.avatarUrl ? (
            <Image
              src={membership.user.avatarUrl}
              alt=""
              width={96}
              height={96}
              className="object-cover h-24 w-24"
            />
          ) : (
            <span
              className="font-[family-name:var(--font-display)] text-3xl"
              style={{ color: chamber.brandColor }}
            >
              {(membership.user.name ?? membership.user.email)[0]?.toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p
            className="text-[10px] uppercase tracking-[0.22em]"
            style={{ color: chamber.brandColor }}
          >
            {membership.role.replaceAll("_", " ")} · {chamber.name}
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight mt-2">
            {membership.user.name ?? membership.user.email}
          </h1>
          {membership.user.headline && (
            <p className="mt-2 text-[var(--color-ink-muted)]">{membership.user.headline}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--color-ink-muted)]">
            {membership.user.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={12} strokeWidth={1.7} />
                {membership.user.location}
              </span>
            )}
            {membership.tier?.name && <span>{membership.tier.name}</span>}
            {membership.company && (
              <Link
                href={`/c/${chamberSlug}/companies/${membership.company.id}`}
                className="hover:underline"
              >
                {membership.company.name}
              </Link>
            )}
            {membership.tags.length > 0 && (
              <span className="flex flex-wrap gap-1">
                {membership.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-[var(--radius-pill)] bg-[var(--color-accent-soft)] text-[var(--color-accent)] px-2 py-0.5"
                  >
                    {t}
                  </span>
                ))}
              </span>
            )}
          </div>
        </div>

        {!isSelf && (
          <form action="/api/messaging/start" method="post" className="shrink-0">
            <input type="hidden" name="chamberSlug" value={chamberSlug} />
            <input type="hidden" name="targetUserId" value={membership.user.id} />
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-5 py-2.5 text-sm hover:opacity-90"
            >
              <MessageCircle size={16} strokeWidth={1.7} />
              Send message
            </button>
          </form>
        )}
      </header>

      {membership.user.bio && (
        <section className="mt-10 rounded-[var(--radius-card)] border border-[var(--color-line)] p-6">
          <h2 className="text-xs uppercase tracking-[0.22em] text-[var(--color-ink-muted)]">
            About
          </h2>
          <p className="mt-3 text-[var(--color-ink-muted)] leading-relaxed">
            {membership.user.bio}
          </p>
        </section>
      )}

      {tickets.length > 0 && (
        <section className="mt-10">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">Recent events</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {tickets.map((t) => (
              <li
                key={t.id}
                className="rounded-[var(--radius-card)] border border-[var(--color-line)] p-4 flex gap-4 items-start"
              >
                {t.event.coverImageUrl && (
                  <div className="relative h-16 w-16 shrink-0 rounded-md overflow-hidden">
                    <Image
                      src={t.event.coverImageUrl}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[var(--color-ink-muted)]">
                    {t.event.startsAt.toISOString().slice(0, 10)} · {t.status.toLowerCase()}
                  </p>
                  <Link
                    href={`/c/${chamberSlug}/events/${t.event.slug}`}
                    className="block mt-0.5 font-medium hover:underline truncate"
                  >
                    {t.event.title}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {posts.length > 0 && (
        <section className="mt-10">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">Recent forum posts</h2>
          <ul className="mt-4 divide-y divide-[var(--color-line)]">
            {posts.map((p) => (
              <li key={p.id} className="py-4">
                <Link
                  href={`/c/${chamberSlug}/forum/${p.thread.id}`}
                  className="text-sm font-medium hover:underline"
                >
                  {p.thread.title}
                </Link>
                <p className="mt-1 text-sm text-[var(--color-ink-muted)] line-clamp-2">
                  {p.body}
                </p>
                <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                  {p.createdAt.toISOString().slice(0, 10)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {listings.length > 0 && (
        <section className="mt-10">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">Marketplace listings</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {listings.map((l) => (
              <li
                key={l.id}
                className="rounded-[var(--radius-card)] border border-[var(--color-line)] p-4"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
                  {l.category}
                </p>
                <Link
                  href={`/c/${chamberSlug}/marketplace/${l.id}`}
                  className="mt-1 block font-medium hover:underline inline-flex items-center gap-1"
                >
                  {l.title}
                  <ArrowUpRight size={12} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
