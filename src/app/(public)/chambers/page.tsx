import Link from "next/link";
import Image from "next/image";
import { MapPin, Users, CalendarDays, ArrowUpRight } from "lucide-react";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ChambersIndex() {
  const chambers = await prisma.chamber
    .findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        country: true,
        city: true,
        slug: true,
        tagline: true,
        brandColor: true,
        heroImageUrl: true,
        logoUrl: true,
        _count: {
          select: {
            memberships: { where: { status: "ACTIVE" } },
            events: {
              where: {
                status: "PUBLISHED",
                startsAt: { gte: new Date() },
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    })
    .catch(() => []);

  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <header className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-accent)]">
          The network
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(2.75rem,1rem+5vw,5.5rem)] tracking-tight mt-3 leading-[0.95]">
          Chambers
        </h1>
        <p className="mt-6 text-lg text-[var(--color-ink-muted)]">
          Every chamber on DanChamp runs as its own isolated tenant. Public-facing
          pages are indexed; private operations are not.
        </p>
      </header>

      {chambers.length === 0 ? (
        <p className="mt-16 text-sm text-[var(--color-ink-muted)]">
          No chambers provisioned yet. The Operator console is at{" "}
          <code>/operator</code>.
        </p>
      ) : (
        <ul className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {chambers.map((c) => {
            const accent = c.brandColor ?? "var(--color-accent)";
            return (
              <li
                key={c.id}
                className="group overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] flex flex-col transition-shadow hover:shadow-[0_30px_70px_-35px_rgba(15,23,42,0.45)]"
              >
                <div
                  className="relative h-48 w-full overflow-hidden"
                  style={{ backgroundColor: accent }}
                >
                  {c.heroImageUrl && (
                    <Image
                      src={c.heroImageUrl}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover opacity-85 transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                  <div
                    className="absolute inset-x-0 bottom-0 h-1.5"
                    style={{ backgroundColor: accent }}
                  />
                  {c.logoUrl && (
                    <div className="absolute top-4 left-4 h-10 w-10 rounded-full bg-[var(--color-surface)] border border-[var(--color-line)] overflow-hidden">
                      <Image
                        src={c.logoUrl}
                        alt={`${c.name} logo`}
                        width={40}
                        height={40}
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="absolute top-4 right-4 inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-[var(--color-surface)]/95 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink)]">
                    <MapPin size={11} strokeWidth={1.8} />
                    {c.city ?? c.country}
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-muted)]">
                      {c.country}
                    </p>
                    <p className="font-[family-name:var(--font-display)] text-2xl mt-1.5 leading-tight">
                      {c.name}
                    </p>
                    {c.tagline && (
                      <p className="text-sm text-[var(--color-ink-muted)] mt-2 line-clamp-2">
                        {c.tagline}
                      </p>
                    )}
                  </div>

                  <dl className="mt-auto grid grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-2 rounded-[var(--radius-pill)] bg-[var(--color-surface-2)] px-3 py-2">
                      <Users size={14} strokeWidth={1.6} className="text-[var(--color-ink-muted)]" />
                      <span className="font-medium tabular-nums">
                        {c._count.memberships}
                      </span>
                      <span className="text-[var(--color-ink-muted)]">members</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-[var(--radius-pill)] bg-[var(--color-surface-2)] px-3 py-2">
                      <CalendarDays
                        size={14}
                        strokeWidth={1.6}
                        className="text-[var(--color-ink-muted)]"
                      />
                      <span className="font-medium tabular-nums">
                        {c._count.events}
                      </span>
                      <span className="text-[var(--color-ink-muted)]">events</span>
                    </div>
                  </dl>

                  <Link
                    href={`/c/${c.slug}`}
                    className="inline-flex items-center justify-between text-sm rounded-[var(--radius-pill)] border border-[var(--color-line)] px-4 py-2.5 hover:border-[var(--color-ink)] transition-colors"
                  >
                    <span>Visit chamber</span>
                    <ArrowUpRight size={16} strokeWidth={1.7} />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
