import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { MapPin, Users, CalendarDays, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { chamberRoleFor } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ chamberSlug: string }>;
}): Promise<Metadata> {
  const { chamberSlug } = await params;
  const chamber = await prisma.chamber.findUnique({
    where: { slug: chamberSlug },
    select: { name: true, country: true, status: true },
  });
  if (!chamber || chamber.status !== "ACTIVE") return { title: "Chamber not found" };
  return {
    title: chamber.name,
    description: `${chamber.name} — running on DanChamp.`,
  };
}

export default async function ChamberLanding({
  params,
}: {
  params: Promise<{ chamberSlug: string }>;
}) {
  const { chamberSlug } = await params;
  const chamber = await prisma.chamber.findUnique({
    where: { slug: chamberSlug },
    select: {
      id: true,
      name: true,
      country: true,
      city: true,
      tagline: true,
      brandColor: true,
      heroImageUrl: true,
      status: true,
    },
  });
  if (!chamber || chamber.status !== "ACTIVE") notFound();

  const session = await getSession();
  const role = chamberRoleFor(session, chamber.id);

  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 60);

  const [publicEvents, publicArticles, memberCount, eventCount] = await Promise.all([
    prisma.event.findMany({
      where: {
        chamberId: chamber.id,
        visibility: "PUBLIC",
        status: "PUBLISHED",
        startsAt: { gte: new Date() },
      },
      orderBy: { startsAt: "asc" },
      take: 6,
    }),
    prisma.knowledgeArticle.findMany({
      where: { chamberId: chamber.id, isPublic: true },
      orderBy: { updatedAt: "desc" },
      take: 4,
    }),
    prisma.membership.count({
      where: { chamberId: chamber.id, status: "ACTIVE" },
    }),
    prisma.event.count({
      where: {
        chamberId: chamber.id,
        status: "PUBLISHED",
        startsAt: { gte: new Date(), lte: horizon },
      },
    }),
  ]);

  const isMember = Boolean(role && role !== "PUBLIC");

  return (
    <article>
      <section className="relative border-b border-[var(--color-border)] overflow-hidden">
        {chamber.heroImageUrl && (
          <div
            className="absolute inset-0 -z-10 opacity-15"
            style={{
              backgroundImage: `url(${chamber.heroImageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
            aria-hidden="true"
          />
        )}
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-16 sm:py-20">
          <div className="flex items-center gap-3">
            <span
              className="inline-flex h-10 w-10 items-center justify-center rounded-md text-white font-semibold"
              style={{ background: chamber.brandColor }}
              aria-hidden="true"
            >
              {chamber.name[0]}
            </span>
            <div>
              <p className="text-[12px] text-[var(--color-fg-muted)] inline-flex items-center gap-1">
                <MapPin size={12} />
                {chamber.city ? `${chamber.city}, ${chamber.country}` : chamber.country}
              </p>
            </div>
          </div>

          <h1 className="mt-5 text-3xl sm:text-5xl font-semibold tracking-tight leading-tight max-w-3xl">
            {chamber.name}
          </h1>
          {chamber.tagline && (
            <p className="mt-4 max-w-2xl text-[15px] sm:text-base text-[var(--color-fg-muted)] leading-relaxed">
              {chamber.tagline}
            </p>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            {isMember ? (
              <Link href={`/c/${chamberSlug}/directory`} className="btn btn-md btn-primary">
                Open member area
                <ArrowRight size={14} />
              </Link>
            ) : (
              <Link href={`/c/${chamberSlug}/apply`} className="btn btn-md btn-primary">
                Apply for membership
                <ArrowRight size={14} />
              </Link>
            )}
            <Link href={`/c/${chamberSlug}/events`} className="btn btn-md btn-secondary">
              See events
            </Link>
          </div>

          <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4">
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-[var(--color-fg-subtle)] inline-flex items-center gap-1">
                <Users size={11} />
                Members
              </dt>
              <dd className="text-2xl font-semibold tabular-nums mt-1">
                {memberCount}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-[var(--color-fg-subtle)] inline-flex items-center gap-1">
                <CalendarDays size={11} />
                Upcoming events
              </dt>
              <dd className="text-2xl font-semibold tabular-nums mt-1">
                {eventCount}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 sm:px-6 py-12 sm:py-16">
        <div className="flex items-end justify-between gap-4 mb-6">
          <h2 className="text-xl font-semibold tracking-tight">Upcoming events</h2>
          <Link href={`/c/${chamberSlug}/events`} className="btn btn-sm btn-ghost">
            All events
            <ArrowRight size={12} />
          </Link>
        </div>
        {publicEvents.length === 0 ? (
          <p className="card p-8 text-center text-[13px] text-[var(--color-fg-muted)]">
            No upcoming public events.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {publicEvents.map((e) => (
              <li
                key={e.id}
                className="card overflow-hidden hover:shadow-[var(--shadow-md)] transition-shadow"
              >
                <Link href={`/c/${chamberSlug}/events/${e.slug}`} className="block">
                  {e.coverImageUrl && (
                    <div className="relative h-32 bg-[var(--color-bg-muted)]">
                      <Image
                        src={e.coverImageUrl}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 33vw, 50vw"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <p className="text-[11px] text-[var(--color-fg-subtle)]">
                      {e.startsAt.toISOString().slice(0, 10)}
                      {e.location ? ` · ${e.location}` : ""}
                    </p>
                    <p className="mt-1 font-semibold text-[15px] leading-snug line-clamp-2">
                      {e.title}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {publicArticles.length > 0 && (
        <section className="border-t border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12 sm:py-16">
            <h2 className="text-xl font-semibold tracking-tight mb-6">From the chamber</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {publicArticles.map((a) => (
                <li
                  key={a.id}
                  className="card p-5 hover:shadow-[var(--shadow-md)] transition-shadow"
                >
                  <Link href={`/c/${chamberSlug}/knowledge/${a.slug}`} className="block">
                    <p className="text-[11px] text-[var(--color-fg-subtle)]">
                      {a.updatedAt.toISOString().slice(0, 10)}
                    </p>
                    <p className="mt-1 font-semibold text-[15px] leading-snug">
                      {a.title}
                    </p>
                    {a.excerpt && (
                      <p className="mt-2 text-[13px] text-[var(--color-fg-muted)] line-clamp-2">
                        {a.excerpt}
                      </p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {!session && (
        <section className="border-t border-[var(--color-border)]">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12 text-center">
            <p className="text-[15px] font-medium">Already a member?</p>
            <Link href="/login" className="btn btn-md btn-primary mt-3">
              Sign in
            </Link>
          </div>
        </section>
      )}
    </article>
  );
}
