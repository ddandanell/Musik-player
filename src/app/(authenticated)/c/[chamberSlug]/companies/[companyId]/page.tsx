import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Building2, Users, MapPin } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { chamberRoleFor } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function CompanyProfilePage({
  params,
}: {
  params: Promise<{ chamberSlug: string; companyId: string }>;
}) {
  const { chamberSlug, companyId } = await params;
  const session = await requireSession();

  const chamber = await prisma.chamber.findUnique({
    where: { slug: chamberSlug },
    select: { id: true, name: true, brandColor: true },
  });
  if (!chamber) notFound();
  if (!chamberRoleFor(session, chamber.id)) {
    redirect(`/c/${chamberSlug}`);
  }

  const company = await prisma.company.findFirst({
    where: { id: companyId, chamberId: chamber.id },
    include: {
      memberships: {
        where: { status: "ACTIVE" },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true, headline: true },
          },
        },
        orderBy: { joinedAt: "desc" },
      },
      contacts: {
        where: { isPrimary: true },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });
  if (!company) notFound();

  const userIds = company.memberships.map((m) => m.user.id);

  const ticketsThisQuarter = userIds.length > 0
    ? await prisma.ticket.count({
        where: {
          userId: { in: userIds },
          status: { in: ["PAID", "CHECKED_IN"] },
          event: { chamberId: chamber.id, startsAt: { gte: quarterStart() } },
        },
      })
    : 0;

  const primaryContact = company.contacts[0]?.user;

  return (
    <section className="mx-auto max-w-4xl px-6 py-12">
      <Link
        href={`/c/${chamberSlug}/directory`}
        className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
      >
        ← Back to directory
      </Link>

      <header className="mt-6 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-8">
        <div className="flex items-start gap-4">
          <span
            className="inline-flex h-14 w-14 items-center justify-center rounded-[var(--radius-card)] text-[var(--color-surface)]"
            style={{ background: chamber.brandColor }}
          >
            <Building2 size={22} strokeWidth={1.7} />
          </span>
          <div>
            <p
              className="text-[10px] uppercase tracking-[0.22em]"
              style={{ color: chamber.brandColor }}
            >
              Member company · {chamber.name}
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight mt-2">
              {company.name}
            </h1>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-[var(--color-ink-muted)]">
              {company.industry && <span>{company.industry}</span>}
              {company.country && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={12} strokeWidth={1.7} />
                  {company.country}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Users size={12} strokeWidth={1.7} />
                {company.memberships.length} of {company.seats} seats active
              </span>
            </div>
          </div>
        </div>
      </header>

      <dl className="mt-10 grid grid-cols-3 gap-3">
        <Stat label="Active employees" value={company.memberships.length} />
        <Stat label="Seats" value={company.seats} />
        <Stat label="Events this quarter" value={ticketsThisQuarter} />
      </dl>

      {primaryContact && (
        <section className="mt-10 rounded-[var(--radius-card)] border border-[var(--color-line)] p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-ink-muted)]">
            Primary contact
          </p>
          <Link
            href={`/u/${chamberSlug}/${primaryContact.id}`}
            className="mt-2 inline-block font-[family-name:var(--font-display)] text-xl hover:underline"
          >
            {primaryContact.name ?? primaryContact.email}
          </Link>
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">Team in {chamber.name}</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {company.memberships.map((m) => (
            <li
              key={m.id}
              className="rounded-[var(--radius-card)] border border-[var(--color-line)] p-4 flex items-start gap-3"
            >
              {m.user.avatarUrl ? (
                <Image
                  src={m.user.avatarUrl}
                  alt=""
                  width={44}
                  height={44}
                  className="rounded-full h-11 w-11 object-cover"
                />
              ) : (
                <div
                  className="rounded-full h-11 w-11 flex items-center justify-center text-sm text-[var(--color-surface)]"
                  style={{ background: chamber.brandColor }}
                >
                  {(m.user.name ?? m.user.email)[0]?.toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <Link
                  href={`/u/${chamberSlug}/${m.user.id}`}
                  className="font-medium truncate hover:underline block"
                >
                  {m.user.name ?? m.user.email}
                </Link>
                {m.user.headline && (
                  <p className="text-xs text-[var(--color-ink-muted)] line-clamp-2 mt-0.5">
                    {m.user.headline}
                  </p>
                )}
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent)] mt-1">
                  {m.role.replaceAll("_", " ")}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] p-4">
      <dt className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
        {label}
      </dt>
      <dd className="font-[family-name:var(--font-display)] text-3xl mt-1">{value}</dd>
    </div>
  );
}

function quarterStart(): Date {
  const now = new Date();
  const startMonth = Math.floor(now.getUTCMonth() / 3) * 3;
  return new Date(Date.UTC(now.getUTCFullYear(), startMonth, 1));
}
