import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";
import { currentQuarter, quarterParam, quarterLabel } from "@/lib/quarter";

export const dynamic = "force-dynamic";

export default async function CorporateDashboard({
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
  if (!hasChamberRole(session, chamber.id, "CORPORATE_CONTACT")) {
    redirect(`/c/${chamberSlug}`);
  }

  const myCompanies = await prisma.companyContact.findMany({
    where: { userId: session.userId, company: { chamberId: chamber.id } },
    include: {
      company: {
        include: {
          memberships: {
            where: { status: "ACTIVE" },
            include: { user: { select: { name: true, email: true } } },
          },
        },
      },
    },
  });

  const period = currentQuarter();
  const periodSlug = quarterParam(period);

  return (
    <div>
      <header className="flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">
            Corporate dashboard
          </h1>
          <p className="text-[var(--color-ink-muted)] mt-2">{chamber.name}</p>
        </div>
        {myCompanies.length > 0 && (
          <Link
            href={`/c/${chamberSlug}/corporate/report/${periodSlug}`}
            className="rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-4 py-2 text-sm"
          >
            {quarterLabel(period)} value report →
          </Link>
        )}
      </header>

      {myCompanies.length === 0 ? (
        <p className="mt-12 text-sm text-[var(--color-ink-muted)]">
          No companies linked to your contact yet.
        </p>
      ) : (
        myCompanies.map(({ company }) => (
          <article
            key={company.id}
            className="mt-10 rounded-[var(--radius-card)] border border-[var(--color-line)] p-6"
          >
            <header className="flex items-baseline justify-between">
              <h2 className="font-[family-name:var(--font-display)] text-2xl">
                {company.name}
              </h2>
              <p className="text-xs text-[var(--color-ink-muted)]">
                {company.memberships.length} of {company.seats} seats active
              </p>
            </header>
            <ul className="mt-6 grid sm:grid-cols-2 gap-2 text-sm">
              {company.memberships.map((m) => (
                <li key={m.id} className="text-[var(--color-ink-muted)]">
                  {m.user.name ?? m.user.email}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex gap-2 text-xs">
              <Link
                href={`/c/${chamberSlug}/corporate/report/${periodSlug}?companyId=${company.id}`}
                className="rounded-[var(--radius-pill)] border border-[var(--color-line)] px-3 py-1.5 hover:border-[var(--color-ink)]"
              >
                {quarterLabel(period)} report
              </Link>
            </div>
          </article>
        ))
      )}
    </div>
  );
}
