import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Building2, Calendar, MessageSquare, Users } from "lucide-react";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    Icon: Users,
    title: "Members & directory",
    body: "One database for every member. Search, tag, segment, export.",
  },
  {
    Icon: Calendar,
    title: "Events & ticketing",
    body: "Public or private. Capacity-aware RSVP. Auto reminders. Check-in.",
  },
  {
    Icon: Building2,
    title: "Board governance",
    body: "Motions, votes, signed minutes, conflict-of-interest register.",
  },
  {
    Icon: MessageSquare,
    title: "Communication",
    body: "Email and WhatsApp from one place. Every send logged on the member.",
  },
];

export default async function HomePage() {
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 30);

  const [chamberCount, memberCount, upcomingEventCount, chambers] = await Promise.all([
    prisma.chamber.count({ where: { status: "ACTIVE" } }).catch(() => 0),
    prisma.membership.count({ where: { status: "ACTIVE" } }).catch(() => 0),
    prisma.event
      .count({
        where: {
          status: "PUBLISHED",
          startsAt: { gte: new Date(), lte: horizon },
        },
      })
      .catch(() => 0),
    prisma.chamber
      .findMany({
        where: { status: "ACTIVE" },
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          country: true,
          tagline: true,
          brandColor: true,
          heroImageUrl: true,
        },
        orderBy: { name: "asc" },
        take: 4,
      })
      .catch(() => []),
  ]);

  return (
    <>
      <section className="border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-20">
          <span className="pill pill-accent">Chamber operating system</span>
          <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight max-w-3xl leading-[1.05]">
            Run your chamber on one platform.
          </h1>
          <p className="mt-6 max-w-2xl text-base sm:text-lg text-[var(--color-fg-muted)] leading-relaxed">
            Members, events, payments, board governance, and communication.
            Replaces the spreadsheet, WhatsApp group, free Mailchimp, and
            hand-written invoices.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {process.env.NEXT_PUBLIC_DEMO_MODE === "1" ? (
              <Link href="/demo/walkthrough" className="btn btn-lg btn-primary">
                Take the tour
                <ArrowRight size={16} />
              </Link>
            ) : (
              <Link href="/for-chambers" className="btn btn-lg btn-primary">
                Get started
                <ArrowRight size={16} />
              </Link>
            )}
            <Link href="/chambers" className="btn btn-lg btn-secondary">
              See chambers
            </Link>
          </div>

          <dl className="mt-14 grid grid-cols-3 gap-6 sm:gap-12 max-w-2xl">
            <Stat label="Active chambers" value={chamberCount} />
            <Stat label="Members" value={memberCount} />
            <Stat label="Upcoming events" value={upcomingEventCount} />
          </dl>
        </div>
      </section>

      <section className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
          <div className="max-w-2xl">
            <span className="text-xs uppercase tracking-wider text-[var(--color-fg-subtle)]">
              Everything in one place
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight">
              Built for the people who run the chamber.
            </h2>
          </div>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <li key={f.title} className="card p-6">
                <span
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md"
                  style={{
                    background: "var(--color-accent-soft)",
                    color: "var(--color-accent)",
                  }}
                >
                  <f.Icon size={18} strokeWidth={1.8} />
                </span>
                <p className="mt-4 font-semibold">{f.title}</p>
                <p className="mt-1.5 text-[13px] text-[var(--color-fg-muted)] leading-relaxed">
                  {f.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {chambers.length > 0 && (
        <section className="border-b border-[var(--color-border)]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                <span className="text-xs uppercase tracking-wider text-[var(--color-fg-subtle)]">
                  Now serving
                </span>
                <h2 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight">
                  Four Scandinavian chambers in Indonesia.
                </h2>
              </div>
              <Link href="/chambers" className="btn btn-md btn-ghost">
                See all
                <ArrowRight size={14} />
              </Link>
            </div>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {chambers.map((c) => (
                <li
                  key={c.id}
                  className="card overflow-hidden hover:shadow-[var(--shadow-md)] transition-shadow"
                >
                  <Link href={`/c/${c.slug}`} className="block">
                    <div
                      className="relative h-32"
                      style={{ background: c.brandColor }}
                    >
                      {c.heroImageUrl && (
                        <Image
                          src={c.heroImageUrl}
                          alt=""
                          fill
                          sizes="(min-width: 1024px) 25vw, 50vw"
                          className="object-cover opacity-70"
                        />
                      )}
                    </div>
                    <div className="p-4">
                      <p className="text-[11px] text-[var(--color-fg-subtle)]">
                        {c.city ? `${c.city}, ${c.country}` : c.country}
                      </p>
                      <p className="font-semibold mt-1 text-[15px] leading-snug">
                        {c.name}
                      </p>
                      {c.tagline && (
                        <p className="mt-2 text-[12px] text-[var(--color-fg-muted)] line-clamp-2">
                          {c.tagline}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            See it from every angle.
          </h2>
          <p className="mt-4 text-[var(--color-fg-muted)] max-w-xl mx-auto">
            Step into any of five personas — operator, admin, board member,
            corporate sponsor, or business member — and see exactly what they see.
          </p>
          {process.env.NEXT_PUBLIC_DEMO_MODE === "1" && (
            <div className="mt-8 flex justify-center gap-3 flex-wrap">
              <Link href="/demo/walkthrough" className="btn btn-lg btn-primary">
                Guided tour
                <ArrowRight size={16} />
              </Link>
              <Link href="/demo" className="btn btn-lg btn-secondary">
                Pick a persona
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs text-[var(--color-fg-subtle)] uppercase tracking-wider">
        {label}
      </dt>
      <dd className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums">
        {value}
      </dd>
    </div>
  );
}
