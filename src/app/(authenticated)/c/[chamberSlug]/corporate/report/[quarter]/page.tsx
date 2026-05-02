import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";
import {
  parseQuarterParam,
  quarterRange,
  quarterLabel,
  currentQuarter,
} from "@/lib/quarter";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

export default async function QuarterlyReport({
  params,
  searchParams,
}: {
  params: Promise<{ chamberSlug: string; quarter: string }>;
  searchParams: Promise<{ companyId?: string }>;
}) {
  const { chamberSlug, quarter } = await params;
  const sp = await searchParams;
  const session = await requireSession();

  const chamber = await prisma.chamber.findUnique({
    where: { slug: chamberSlug },
    select: { id: true, name: true, brandColor: true, currency: true },
  });
  if (!chamber) notFound();
  if (!hasChamberRole(session, chamber.id, "CORPORATE_CONTACT")) {
    redirect(`/c/${chamberSlug}`);
  }

  const period = parseQuarterParam(quarter) ?? currentQuarter();
  const { from, to } = quarterRange(period);

  const companies = await prisma.companyContact.findMany({
    where: { userId: session.userId, company: { chamberId: chamber.id } },
    include: {
      company: { select: { id: true, name: true, seats: true } },
    },
  });

  if (companies.length === 0) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="font-[family-name:var(--font-display)] text-3xl">
          No companies linked
        </h1>
        <p className="mt-3 text-[var(--color-ink-muted)]">
          Your contact is not linked to any company at {chamber.name}.
        </p>
      </section>
    );
  }

  const selectedCompanyId = sp.companyId ?? companies[0].company.id;
  const selectedCompany =
    companies.find((c) => c.company.id === selectedCompanyId)?.company ??
    companies[0].company;

  const memberships = await prisma.membership.findMany({
    where: { companyId: selectedCompany.id, status: "ACTIVE" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  const userIds = memberships.map((m) => m.user.id);

  const [tickets, postsCount, marketplaceCount] = await Promise.all([
    prisma.ticket.findMany({
      where: {
        userId: { in: userIds },
        status: { in: ["PAID", "CHECKED_IN", "RESERVED"] },
        event: { chamberId: chamber.id, startsAt: { gte: from, lt: to } },
      },
      include: {
        event: { select: { id: true, title: true, startsAt: true } },
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.forumPost.count({
      where: {
        authorId: { in: userIds },
        createdAt: { gte: from, lt: to },
        thread: { chamberId: chamber.id },
      },
    }),
    prisma.marketplaceListing.count({
      where: {
        sellerUserId: { in: userIds },
        chamberId: chamber.id,
        createdAt: { gte: from, lt: to },
      },
    }),
  ]);

  const checkedInCount = tickets.filter((t) => t.status === "CHECKED_IN").length;
  const eventsAttended = new Set(
    tickets.filter((t) => t.status === "CHECKED_IN" || t.status === "PAID").map((t) => t.event.id),
  );
  const activeUsers = new Set(tickets.map((t) => t.user.email));
  const estimatedValuePerEvent = 250;
  const roiEstimate = checkedInCount * estimatedValuePerEvent;

  const ticketsByEvent = new Map<
    string,
    { event: (typeof tickets)[number]["event"]; attendees: string[] }
  >();
  for (const t of tickets) {
    const bucket = ticketsByEvent.get(t.event.id) ?? { event: t.event, attendees: [] };
    bucket.attendees.push(t.user.name ?? t.user.email);
    ticketsByEvent.set(t.event.id, bucket);
  }

  return (
    <article className="mx-auto max-w-3xl px-6 py-12 print:py-4 print:max-w-none">
      <header className="border-b border-[var(--color-line)] pb-6">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-ink-muted)]">
          Quarterly value report
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-5xl mt-3 leading-[1]">
          {quarterLabel(period)}
        </h1>
        <p
          className="mt-3 text-lg"
          style={{ color: chamber.brandColor }}
        >
          {selectedCompany.name} · {chamber.name}
        </p>
      </header>

      <section className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Active employees" value={`${activeUsers.size} of ${selectedCompany.seats}`} />
        <Stat label="Events attended" value={eventsAttended.size} />
        <Stat label="Forum posts" value={postsCount} />
        <Stat label={`Estimated ROI (${chamber.currency})`} value={roiEstimate.toLocaleString()} />
      </section>

      <section className="mt-12">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">Event participation</h2>
        {ticketsByEvent.size === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
            No event participation in this quarter.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--color-line)]">
            {Array.from(ticketsByEvent.values()).map(({ event, attendees }) => (
              <li key={event.id} className="py-4">
                <p className="font-medium">{event.title}</p>
                <p className="text-xs text-[var(--color-ink-muted)] mt-1">
                  {event.startsAt.toISOString().slice(0, 10)} · {attendees.length} attendee
                  {attendees.length === 1 ? "" : "s"}: {attendees.join(", ")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">Other engagement</h2>
        <ul className="mt-3 text-sm text-[var(--color-ink-muted)] space-y-1">
          <li>{postsCount} forum post{postsCount === 1 ? "" : "s"} authored</li>
          <li>{marketplaceCount} marketplace listing{marketplaceCount === 1 ? "" : "s"} created</li>
          <li>{checkedInCount} confirmed check-in{checkedInCount === 1 ? "" : "s"}</li>
        </ul>
      </section>

      <footer className="mt-16 border-t border-[var(--color-line)] pt-6 text-xs text-[var(--color-ink-muted)] print:hidden flex items-center justify-between gap-4">
        <p>
          Estimated ROI uses a conservative {estimatedValuePerEvent.toLocaleString()}{" "}
          {chamber.currency} per check-in. Adjust in chamber settings.
        </p>
        <PrintButton />
      </footer>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] p-4 print:break-inside-avoid">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
        {label}
      </p>
      <p className="font-[family-name:var(--font-display)] text-3xl mt-1">{value}</p>
    </div>
  );
}
