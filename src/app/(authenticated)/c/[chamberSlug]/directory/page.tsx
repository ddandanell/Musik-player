import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { Search, MapPin, Briefcase } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { chamberRoleFor } from "@/lib/auth/permissions";
import type { ChamberRole, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const RESULT_LIMIT = 60;

const ROLE_OPTIONS: ChamberRole[] = [
  "CHAMBER_ADMIN",
  "BOARD_MEMBER",
  "CORPORATE_CONTACT",
  "BUSINESS_MEMBER",
  "PUBLIC",
];

function initialsOf(label: string): string {
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function DirectoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ chamberSlug: string }>;
  searchParams: Promise<{ q?: string; role?: string; company?: string }>;
}) {
  const { chamberSlug } = await params;
  const sp = await searchParams;
  const session = await requireSession();

  const chamber = await prisma.chamber.findUnique({
    where: { slug: chamberSlug },
    select: { id: true, name: true },
  });
  if (!chamber) notFound();

  if (!chamberRoleFor(session, chamber.id)) {
    redirect(`/c/${chamberSlug}`);
  }

  const q = sp.q?.trim() ?? "";
  const roleFilter = ROLE_OPTIONS.includes(sp.role as ChamberRole)
    ? (sp.role as ChamberRole)
    : undefined;
  const companyFilter = sp.company?.trim() || undefined;

  const where: Prisma.MembershipWhereInput = {
    chamberId: chamber.id,
    status: "ACTIVE",
  };

  if (roleFilter) where.role = roleFilter;
  if (companyFilter) where.companyId = companyFilter;

  if (q.length > 0) {
    where.OR = [
      { user: { name: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
      { company: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [members, totalCount, companies] = await Promise.all([
    prisma.membership.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            avatarUrl: true,
            headline: true,
            location: true,
          },
        },
        company: { select: { name: true } },
        tier: { select: { name: true } },
      },
      orderBy: { joinedAt: "desc" },
      take: RESULT_LIMIT + 1,
    }),
    prisma.membership.count({ where }),
    prisma.company.findMany({
      where: { chamberId: chamber.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const truncated = members.length > RESULT_LIMIT;
  const visibleMembers = truncated ? members.slice(0, RESULT_LIMIT) : members;

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-accent)]">
            {chamber.name}
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight mt-2">
            Member directory
          </h1>
          <p className="text-[var(--color-ink-muted)] mt-2 text-sm">
            {totalCount} member{totalCount === 1 ? "" : "s"} match your filter.
          </p>
        </div>
      </header>

      <form
        method="get"
        className="mt-8 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4 grid gap-3 sm:grid-cols-[1fr_180px_220px_auto] items-end"
      >
        <label className="block text-sm">
          <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-muted)]">
            Search
          </span>
          <span className="mt-1.5 flex items-center gap-2 rounded-[var(--radius-pill)] bg-[var(--color-surface)] border border-[var(--color-line)] px-4 py-2 focus-within:border-[var(--color-ink)]">
            <Search size={14} strokeWidth={1.7} className="text-[var(--color-ink-muted)]" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Name, email, or company"
              className="w-full bg-transparent outline-none placeholder:text-[var(--color-ink-muted)]"
            />
          </span>
        </label>

        <label className="block text-sm">
          <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-muted)]">
            Role
          </span>
          <select
            name="role"
            defaultValue={roleFilter ?? ""}
            className="mt-1.5 w-full rounded-[var(--radius-pill)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-2"
          >
            <option value="">Any role</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-muted)]">
            Company
          </span>
          <select
            name="company"
            defaultValue={companyFilter ?? ""}
            className="mt-1.5 w-full rounded-[var(--radius-pill)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-2"
          >
            <option value="">Any company</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-6 py-2.5 text-sm h-fit hover:opacity-90"
        >
          Filter
        </button>
      </form>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleMembers.length === 0 && (
          <li className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-line)] p-10 text-center text-sm text-[var(--color-ink-muted)] sm:col-span-2 lg:col-span-3">
            No members match this filter.
          </li>
        )}
        {visibleMembers.map((m) => {
          const displayName = m.user.name ?? m.user.email;
          return (
            <li
              key={m.id}
              className="group rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5 transition-colors hover:border-[var(--color-ink)]"
            >
              <a
                href={`/u/${chamberSlug}/${m.userId}`}
                className="block hover:no-underline"
              >
              <div className="flex items-start gap-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[var(--radius-card)] bg-[var(--color-surface-2)] flex items-center justify-center">
                  {m.user.avatarUrl ? (
                    <Image
                      src={m.user.avatarUrl}
                      alt=""
                      width={64}
                      height={64}
                      className="h-16 w-16 object-cover"
                    />
                  ) : (
                    <span className="font-[family-name:var(--font-display)] text-xl text-[var(--color-ink-muted)]">
                      {initialsOf(displayName)}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{displayName}</p>
                  {m.user.headline && (
                    <p className="text-xs text-[var(--color-ink-muted)] mt-0.5 line-clamp-2">
                      {m.user.headline}
                    </p>
                  )}
                  {m.user.location && (
                    <p className="text-[11px] text-[var(--color-ink-muted)] mt-1.5 inline-flex items-center gap-1">
                      <MapPin size={11} strokeWidth={1.7} />
                      {m.user.location}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5 text-[11px]">
                <span className="rounded-[var(--radius-pill)] bg-[var(--color-accent-soft)] text-[var(--color-accent)] px-2.5 py-1 uppercase tracking-[0.14em]">
                  {m.role.replaceAll("_", " ")}
                </span>
                {m.company?.name && (
                  <span className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-[var(--color-line)] px-2.5 py-1 text-[var(--color-ink-muted)]">
                    <Briefcase size={11} strokeWidth={1.7} />
                    {m.company.name}
                  </span>
                )}
                {m.tier?.name && (
                  <span className="rounded-[var(--radius-pill)] border border-[var(--color-line)] px-2.5 py-1 text-[var(--color-ink-muted)]">
                    {m.tier.name}
                  </span>
                )}
              </div>
              </a>
            </li>
          );
        })}
      </ul>

      {truncated && (
        <p className="mt-6 text-sm text-[var(--color-ink-muted)]">
          Showing first {RESULT_LIMIT} results. Refine your search.
        </p>
      )}
    </div>
  );
}
