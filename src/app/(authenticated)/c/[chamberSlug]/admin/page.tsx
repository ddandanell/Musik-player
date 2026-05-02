import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Inbox, Users, Calendar, FileText } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AdminOverview({
  params,
}: {
  params: Promise<{ chamberSlug: string }>;
}) {
  const { chamberSlug } = await params;
  const session = await requireSession();
  const chamber = await prisma.chamber.findUnique({
    where: { slug: chamberSlug },
    select: { id: true, name: true },
  });
  if (!chamber) notFound();
  if (!hasChamberRole(session, chamber.id, "CHAMBER_ADMIN")) {
    redirect(`/c/${chamberSlug}`);
  }

  const [members, pending, upcomingEvents, openInvoices] = await Promise.all([
    prisma.membership.count({ where: { chamberId: chamber.id, status: "ACTIVE" } }),
    prisma.membershipApplication.count({
      where: { chamberId: chamber.id, status: "PENDING_REVIEW" },
    }),
    prisma.event.count({
      where: { chamberId: chamber.id, status: "PUBLISHED", startsAt: { gte: new Date() } },
    }),
    prisma.invoice.count({ where: { chamberId: chamber.id, status: "OPEN" } }),
  ]);

  const stats = [
    { label: "Active members", value: members, Icon: Users, href: `/c/${chamberSlug}/admin/members` },
    { label: "Pending applications", value: pending, Icon: Inbox, href: `/c/${chamberSlug}/admin/applications`, accent: pending > 0 },
    { label: "Upcoming events", value: upcomingEvents, Icon: Calendar, href: `/c/${chamberSlug}/admin/events` },
    { label: "Open invoices", value: openInvoices, Icon: FileText, href: `/c/${chamberSlug}/admin/finance` },
  ];

  return (
    <div>
      <header>
        <p className="text-[11px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
          Admin
        </p>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mt-1">
          Overview
        </h1>
      </header>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <li key={s.label}>
            <Link
              href={s.href}
              className="card p-5 block hover:border-[var(--color-border-strong)] transition-colors"
            >
              <div className="flex items-start justify-between">
                <span
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md"
                  style={{
                    background: s.accent ? "var(--color-accent-soft)" : "var(--color-bg-muted)",
                    color: s.accent ? "var(--color-accent)" : "var(--color-fg-muted)",
                  }}
                >
                  <s.Icon size={15} strokeWidth={1.8} />
                </span>
                <ArrowRight size={14} className="text-[var(--color-fg-subtle)]" />
              </div>
              <p className="mt-4 text-2xl sm:text-3xl font-semibold tabular-nums">
                {s.value}
              </p>
              <p className="mt-1 text-[12px] text-[var(--color-fg-muted)]">{s.label}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
