import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Ticket, Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { chamberRoleFor } from "@/lib/auth/permissions";
import { formatCurrency } from "@/lib/utils";
import { rsvpToEvent } from "./actions";

export const dynamic = "force-dynamic";

function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

const SPONSOR_TIER_RANK = { PLATINUM: 0, GOLD: 1, SILVER: 2, BRONZE: 3 } as const;
const SPONSOR_TIER_ORDER = ["PLATINUM", "GOLD", "SILVER", "BRONZE"] as const;
const SPONSOR_TIER_SIZE: Record<(typeof SPONSOR_TIER_ORDER)[number], number> = {
  PLATINUM: 140,
  GOLD: 110,
  SILVER: 84,
  BRONZE: 64,
};

function sponsorInitial(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || "?";
}

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ chamberSlug: string; eventSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { chamberSlug, eventSlug } = await params;
  const sp = (await searchParams) ?? {};
  const paidFlag = typeof sp.paid === "string" ? sp.paid : null;
  const paymentFlag = typeof sp.payment === "string" ? sp.payment : null;
  const session = await getSession();
  const chamber = await prisma.chamber.findUnique({
    where: { slug: chamberSlug },
    select: { id: true, name: true, currency: true, brandColor: true },
  });
  if (!chamber) notFound();

  const event = await prisma.event.findUnique({
    where: { chamberId_slug: { chamberId: chamber.id, slug: eventSlug } },
    include: {
      ticketTypes: { orderBy: { price: "asc" } },
      sponsors: { include: { sponsor: true } },
      _count: {
        select: {
          tickets: { where: { status: { in: ["RESERVED", "PAID", "CHECKED_IN"] } } },
        },
      },
    },
  });
  if (!event) notFound();
  if (event.status === "DRAFT") notFound();

  const role = chamberRoleFor(session, chamber.id);
  const hasMemberAccess = Boolean(role);
  const isBoardOrAdmin = role === "BOARD_MEMBER" || role === "CHAMBER_ADMIN";

  if (event.visibility !== "PUBLIC" && !hasMemberAccess) notFound();
  if (event.visibility === "BOARD_ONLY" && !isBoardOrAdmin) notFound();

  const reservedCount = event._count.tickets;
  const isFull = event.capacity != null && reservedCount >= event.capacity;
  const standardPrice = event.ticketTypes[0]
    ? Number(event.ticketTypes[0].price.toString())
    : 0;
  const capacityPct =
    event.capacity != null && event.capacity > 0
      ? Math.min(100, Math.round((reservedCount / event.capacity) * 100))
      : null;

  const myTicket = session
    ? await prisma.ticket.findUnique({
        where: { eventId_userId: { eventId: event.id, userId: session.userId } },
        select: { status: true },
      })
    : null;

  const sortedSponsors = [...event.sponsors].sort(
    (a, b) =>
      SPONSOR_TIER_RANK[a.tier] - SPONSOR_TIER_RANK[b.tier] ||
      a.sponsor.name.localeCompare(b.sponsor.name),
  );
  const sponsorsByTier = SPONSOR_TIER_ORDER.map((tier) => ({
    tier,
    items: sortedSponsors.filter((s) => s.tier === tier),
  })).filter((group) => group.items.length > 0);

  const next = `/c/${chamberSlug}/events/${eventSlug}`;
  const loginHref = `/login?next=${encodeURIComponent(next)}`;
  const canRsvp = event.status === "PUBLISHED" && !myTicket;
  const accent = chamber.brandColor ?? "var(--color-accent)";

  return (
    <article>
      <header className="relative isolate overflow-hidden border-b border-[var(--color-line)]">
        <div
          className="absolute inset-0 -z-20 bg-[var(--color-ink)]"
          style={{
            backgroundImage: event.coverImageUrl
              ? `url(${event.coverImageUrl})`
              : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(180deg, rgba(8,12,20,0.5) 0%, rgba(8,12,20,0.85) 80%, rgba(8,12,20,0.95) 100%)",
          }}
          aria-hidden="true"
        />

        <div className="mx-auto max-w-5xl px-6 pt-24 pb-20 text-white">
          <Link
            href={`/c/${chamberSlug}`}
            className="text-xs uppercase tracking-[0.24em] text-white/75 hover:text-white"
          >
            ← {chamber.name}
          </Link>
          <h1 className="mt-6 font-[family-name:var(--font-display)] text-[clamp(2.5rem,1rem+5vw,5rem)] tracking-tight leading-[0.98]">
            {event.title}
          </h1>

          <div className="mt-8 flex flex-wrap gap-2.5 text-xs">
            <span className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] bg-white/15 backdrop-blur px-3.5 py-1.5">
              <CalendarDays size={13} strokeWidth={1.8} />
              {formatLongDate(event.startsAt)}
            </span>
            {event.location && (
              <span className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] bg-white/15 backdrop-blur px-3.5 py-1.5">
                <MapPin size={13} strokeWidth={1.8} />
                {event.location}
              </span>
            )}
            <span className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] bg-white/15 backdrop-blur px-3.5 py-1.5">
              <Users size={13} strokeWidth={1.8} />
              {event.capacity != null
                ? `${reservedCount}/${event.capacity}`
                : `${reservedCount}`}{" "}
              registered
            </span>
          </div>
        </div>

        <div className="h-1.5 w-full" style={{ backgroundColor: accent }} />
      </header>

      <div className="mx-auto max-w-5xl px-6 py-16 grid gap-12 lg:grid-cols-[1.6fr_1fr]">
        <div>
          {paidFlag === "1" && (
            <p className="mb-8 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4 text-sm">
              Payment received — your spot is confirmed.
            </p>
          )}
          {paidFlag === "0" && (
            <p className="mb-8 rounded-[var(--radius-card)] border border-red-300 bg-red-50 p-4 text-sm text-red-700">
              Payment was not completed. Use the link in your invoice email to retry.
            </p>
          )}
          {paymentFlag === "pending" && (
            <p className="mb-8 rounded-[var(--radius-card)] border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
              Your spot is reserved but the payment link could not be generated. Contact the chamber to retry.
            </p>
          )}

          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-accent)]">
            About this event
          </p>
          <div className="mt-4 whitespace-pre-line text-base leading-relaxed text-[var(--color-ink)]">
            {event.description}
          </div>

          <dl className="mt-12 grid gap-6 sm:grid-cols-2 border-t border-[var(--color-line)] pt-8">
            <div>
              <dt className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-muted)]">
                When
              </dt>
              <dd className="mt-1.5 text-sm">{formatLongDate(event.startsAt)}</dd>
            </div>
            {event.location && (
              <div>
                <dt className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-muted)]">
                  Where
                </dt>
                <dd className="mt-1.5 text-sm">{event.location}</dd>
              </div>
            )}
            <div>
              <dt className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-muted)]">
                Hosted by
              </dt>
              <dd className="mt-1.5 text-sm">{chamber.name}</dd>
            </div>
            {event.capacity != null && (
              <div>
                <dt className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-muted)]">
                  Capacity
                </dt>
                <dd className="mt-1.5 text-sm">
                  {reservedCount} of {event.capacity} reserved
                </dd>
              </div>
            )}
          </dl>
        </div>

        <aside className="lg:sticky lg:top-24 self-start">
          <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-6 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.4)]">
            <div className="flex items-baseline justify-between gap-4">
              <p className="font-[family-name:var(--font-display)] text-3xl leading-none">
                {standardPrice === 0
                  ? "Free"
                  : formatCurrency(standardPrice, chamber.currency)}
              </p>
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-[var(--color-accent)]">
                <Ticket size={12} strokeWidth={1.8} />
                RSVP
              </span>
            </div>

            {capacityPct != null && (
              <div className="mt-5">
                <div className="flex items-center justify-between text-[11px] text-[var(--color-ink-muted)]">
                  <span>{reservedCount} reserved</span>
                  <span>{event.capacity} capacity</span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-[var(--color-line)] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${capacityPct}%`,
                      backgroundColor: accent,
                    }}
                  />
                </div>
              </div>
            )}

            <div className="mt-6">
              {event.status === "CANCELLED" ? (
                <p className="text-sm text-red-600">
                  This event has been cancelled.
                </p>
              ) : !session ? (
                <Link
                  href={loginHref}
                  className="block w-full text-center rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-5 py-3 text-sm hover:opacity-90"
                >
                  {isFull ? "Sign in to join waitlist" : "Sign in to RSVP"}
                </Link>
              ) : myTicket ? (
                <p className="text-sm">
                  You&apos;re{" "}
                  {myTicket.status === "WAITLISTED"
                    ? "on the waitlist"
                    : "registered"}
                  .
                </p>
              ) : canRsvp ? (
                <form action={rsvpToEvent}>
                  <input type="hidden" name="chamberSlug" value={chamberSlug} />
                  <input type="hidden" name="eventSlug" value={eventSlug} />
                  <button
                    type="submit"
                    className="w-full rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-5 py-3 text-sm hover:opacity-90"
                  >
                    {isFull
                      ? "Join waitlist"
                      : standardPrice === 0
                        ? "RSVP"
                        : "Reserve a spot"}
                  </button>
                </form>
              ) : null}
            </div>

            <p className="mt-5 text-[11px] text-[var(--color-ink-muted)] leading-relaxed">
              Hosted by {chamber.name}. Confirmations and any payment links arrive
              by email.
            </p>
          </div>
        </aside>
      </div>

      {sponsorsByTier.length > 0 && (
        <section
          aria-labelledby="event-sponsors-heading"
          className="border-t border-[var(--color-line)] bg-[var(--color-surface-2)]"
        >
          <div className="mx-auto max-w-5xl px-6 py-16">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-accent)]">
              With thanks to
            </p>
            <h2
              id="event-sponsors-heading"
              className="mt-3 font-[family-name:var(--font-display)] text-3xl"
            >
              Sponsors
            </h2>

            <div className="mt-10 space-y-10">
              {sponsorsByTier.map((group) => {
                const size = SPONSOR_TIER_SIZE[group.tier];
                return (
                  <div key={group.tier}>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--color-ink-muted)]">
                      {group.tier.toLowerCase()}
                    </p>
                    <ul
                      className="mt-4 flex flex-wrap gap-6 items-center"
                      style={{ rowGap: "1.5rem" }}
                    >
                      {group.items.map((es) => {
                        const sponsor = es.sponsor;
                        const content = sponsor.logoUrl ? (
                          <Image
                            src={sponsor.logoUrl}
                            alt={`${sponsor.name} logo`}
                            width={size}
                            height={Math.round(size * 0.6)}
                            unoptimized
                            className="object-contain bg-white rounded-md"
                            style={{
                              maxHeight: Math.round(size * 0.6),
                              width: "auto",
                              padding: "8px 14px",
                            }}
                          />
                        ) : (
                          <div
                            className="rounded-md flex items-center justify-center text-white font-[family-name:var(--font-display)]"
                            style={{
                              backgroundColor: accent,
                              width: size,
                              height: Math.round(size * 0.6),
                              fontSize: Math.round(size * 0.32),
                            }}
                          >
                            {sponsorInitial(sponsor.name)}
                          </div>
                        );
                        return (
                          <li key={es.id} title={sponsor.name}>
                            {sponsor.websiteUrl ? (
                              <a
                                href={sponsor.websiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block hover:opacity-80 transition-opacity"
                              >
                                {content}
                              </a>
                            ) : (
                              content
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
