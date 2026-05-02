import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";
import { addEventSponsor, removeEventSponsor } from "./actions";

export const dynamic = "force-dynamic";

const TIER_RANK = { PLATINUM: 0, GOLD: 1, SILVER: 2, BRONZE: 3 } as const;

function initialOf(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || "?";
}

export default async function EventSponsorsAdminPage({
  params,
}: {
  params: Promise<{ chamberSlug: string; eventId: string }>;
}) {
  const { chamberSlug, eventId } = await params;
  const session = await requireSession();
  const chamber = await prisma.chamber.findUnique({
    where: { slug: chamberSlug },
    select: { id: true, name: true, brandColor: true },
  });
  if (!chamber) notFound();
  if (!hasChamberRole(session, chamber.id, "CHAMBER_ADMIN")) {
    redirect(`/c/${chamberSlug}`);
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, slug: true, chamberId: true },
  });
  if (!event || event.chamberId !== chamber.id) notFound();

  const [eventSponsors, allSponsors] = await Promise.all([
    prisma.eventSponsor.findMany({
      where: { eventId: event.id },
      include: { sponsor: true },
    }),
    prisma.sponsor.findMany({
      where: { chamberId: chamber.id },
      orderBy: { name: "asc" },
    }),
  ]);

  const sortedEventSponsors = [...eventSponsors].sort(
    (a, b) =>
      TIER_RANK[a.tier] - TIER_RANK[b.tier] ||
      a.sponsor.name.localeCompare(b.sponsor.name),
  );

  const linkedIds = new Set(eventSponsors.map((es) => es.sponsorId));
  const availableSponsors = allSponsors.filter((s) => !linkedIds.has(s.id));

  return (
    <div>
      <Link
        href={`/c/${chamberSlug}/admin/events/${event.id}`}
        className="text-xs uppercase tracking-[0.2em] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
      >
        ← {event.title}
      </Link>
      <h1 className="font-[family-name:var(--font-display)] text-3xl mt-3">
        Event sponsors
      </h1>
      <p className="text-sm text-[var(--color-ink-muted)] mt-2">
        {sortedEventSponsors.length} sponsor{sortedEventSponsors.length === 1 ? "" : "s"} attached
      </p>

      <section className="mt-10">
        <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--color-ink-muted)]">
          Attached
        </h2>
        {sortedEventSponsors.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
            No sponsors yet on this event.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--color-line)]">
            {sortedEventSponsors.map((es) => (
              <li
                key={es.id}
                className="py-4 flex items-center gap-4 flex-wrap"
              >
                <div className="shrink-0">
                  {es.sponsor.logoUrl ? (
                    <Image
                      src={es.sponsor.logoUrl}
                      alt={`${es.sponsor.name} logo`}
                      width={48}
                      height={48}
                      unoptimized
                      className="h-12 w-12 rounded-md object-contain bg-white"
                    />
                  ) : (
                    <div
                      className="h-12 w-12 rounded-md flex items-center justify-center text-white font-[family-name:var(--font-display)] text-lg"
                      style={{ backgroundColor: chamber.brandColor }}
                    >
                      {initialOf(es.sponsor.name)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-[family-name:var(--font-display)] text-base">
                    {es.sponsor.name}
                  </p>
                  <p className="text-xs text-[var(--color-ink-muted)] uppercase tracking-[0.2em] mt-0.5">
                    {es.tier.toLowerCase()}
                  </p>
                </div>
                <form action={removeEventSponsor}>
                  <input type="hidden" name="chamberSlug" value={chamberSlug} />
                  <input type="hidden" name="eventId" value={event.id} />
                  <input type="hidden" name="eventSponsorId" value={es.id} />
                  <button
                    type="submit"
                    className="rounded-[var(--radius-pill)] border border-[var(--color-line)] px-3 py-1.5 text-xs hover:border-red-600 hover:text-red-600"
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--color-ink-muted)]">
          Add sponsor
        </h2>
        {availableSponsors.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
            All chamber sponsors are already attached.{" "}
            <Link
              href={`/c/${chamberSlug}/admin/sponsors/new`}
              className="text-[var(--color-accent)] hover:underline"
            >
              Create a new sponsor
            </Link>
            .
          </p>
        ) : (
          <form
            action={addEventSponsor}
            className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr_auto] items-end max-w-2xl"
          >
            <input type="hidden" name="chamberSlug" value={chamberSlug} />
            <input type="hidden" name="eventId" value={event.id} />
            <label className="block text-sm">
              <span className="text-[var(--color-ink-muted)]">Sponsor</span>
              <select
                name="sponsorId"
                required
                className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"
              >
                {availableSponsors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-[var(--color-ink-muted)]">Tier</span>
              <select
                name="tier"
                defaultValue="SILVER"
                className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"
              >
                <option value="PLATINUM">Platinum</option>
                <option value="GOLD">Gold</option>
                <option value="SILVER">Silver</option>
                <option value="BRONZE">Bronze</option>
              </select>
            </label>
            <button
              type="submit"
              className="rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-4 py-2 text-sm"
            >
              Attach
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
