import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

const ROLE_OPTIONS = [
  { value: "", label: "All roles" },
  { value: "CHAMBER_ADMIN", label: "Chamber admin" },
  { value: "BOARD_MEMBER", label: "Board member" },
  { value: "CORPORATE_CONTACT", label: "Corporate contact" },
  { value: "BUSINESS_MEMBER", label: "Business member" },
] as const;

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "LAPSED", label: "Lapsed" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

type Filters = {
  q?: string;
  role?: string;
  status?: string;
  tag?: string;
  expiring?: string;
};

export default async function AdminMembersPage({
  params,
  searchParams,
}: {
  params: Promise<{ chamberSlug: string }>;
  searchParams: Promise<Filters>;
}) {
  const { chamberSlug } = await params;
  const filters = await searchParams;
  const session = await requireSession();
  const chamber = await prisma.chamber.findUnique({
    where: { slug: chamberSlug },
    select: { id: true },
  });
  if (!chamber) notFound();
  if (!hasChamberRole(session, chamber.id, "CHAMBER_ADMIN")) {
    redirect(`/c/${chamberSlug}`);
  }

  const where: Prisma.MembershipWhereInput = { chamberId: chamber.id };

  if (filters.q && filters.q.length > 0) {
    where.OR = [
      { user: { name: { contains: filters.q, mode: "insensitive" } } },
      { user: { email: { contains: filters.q, mode: "insensitive" } } },
      { company: { name: { contains: filters.q, mode: "insensitive" } } },
    ];
  }
  if (filters.role) where.role = filters.role as Prisma.MembershipWhereInput["role"];
  if (filters.status) where.status = filters.status as Prisma.MembershipWhereInput["status"];
  if (filters.tag) where.tags = { has: filters.tag.toLowerCase() };

  const expiringDays = filters.expiring ? Number(filters.expiring) : null;
  if (expiringDays && Number.isFinite(expiringDays) && expiringDays > 0) {
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + expiringDays);
    where.expiresAt = { gte: new Date(), lte: horizon };
  }

  const [members, allTags] = await Promise.all([
    prisma.membership.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        tier: { select: { name: true } },
        company: { select: { name: true } },
      },
      orderBy: { joinedAt: "desc" },
      take: 200,
    }),
    prisma.membership.findMany({
      where: { chamberId: chamber.id, tags: { isEmpty: false } },
      select: { tags: true },
      take: 500,
    }),
  ]);

  const tagSet = new Set<string>();
  for (const m of allTags) for (const t of m.tags) tagSet.add(t);
  const tagList = Array.from(tagSet).sort();

  const now = new Date();

  return (
    <div>
      <header className="flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">Members</h1>
          <p className="text-[var(--color-ink-muted)] mt-2">
            {members.length} match{members.length === 1 ? "" : "es"}
            {members.length === 200 ? " (capped at 200)" : ""}
          </p>
        </div>
        <Link
          href={`/api/export/${chamberSlug}/members.csv`}
          className="rounded-[var(--radius-pill)] border border-[var(--color-line)] px-4 py-2 text-xs hover:border-[var(--color-ink)]"
        >
          Export CSV
        </Link>
      </header>

      <form
        method="get"
        className="mt-6 flex flex-wrap gap-2 rounded-[var(--radius-card)] border border-[var(--color-line)] p-4"
      >
        <input
          name="q"
          defaultValue={filters.q ?? ""}
          placeholder="Search name, email, company"
          className="flex-1 min-w-[200px] rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm"
        />
        <select
          name="role"
          defaultValue={filters.role ?? ""}
          className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm"
        >
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={filters.status ?? ""}
          className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          name="tag"
          defaultValue={filters.tag ?? ""}
          className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm"
        >
          <option value="">All tags</option>
          {tagList.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          name="expiring"
          defaultValue={filters.expiring ?? ""}
          className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm"
        >
          <option value="">Any renewal</option>
          <option value="30">Expiring ≤ 30 days</option>
          <option value="60">Expiring ≤ 60 days</option>
          <option value="90">Expiring ≤ 90 days</option>
        </select>
        <button
          type="submit"
          className="rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-4 py-2 text-sm"
        >
          Apply
        </button>
      </form>

      <div className="mt-8 overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
      <table className="w-full text-sm min-w-[760px]">
        <thead className="text-left text-[var(--color-ink-muted)] text-xs uppercase tracking-[0.18em]">
          <tr>
            <th className="py-3">Name</th>
            <th>Email</th>
            <th>Company</th>
            <th>Tier</th>
            <th>Role</th>
            <th>Status</th>
            <th>Renewal</th>
            <th>Tags</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-line)]">
          {members.length === 0 && (
            <tr>
              <td colSpan={8} className="py-12 text-center text-[var(--color-ink-muted)]">
                No members match these filters.
              </td>
            </tr>
          )}
          {members.map((m) => {
            const renewal = renewalCell(m.expiresAt, now);
            return (
              <tr key={m.id} className="hover:bg-[var(--color-surface-2)]">
                <td className="py-3">
                  <Link
                    href={`/c/${chamberSlug}/admin/members/${m.id}`}
                    className="hover:underline"
                  >
                    {m.user.name ?? "—"}
                  </Link>
                </td>
                <td className="text-[var(--color-ink-muted)]">{m.user.email}</td>
                <td>{m.company?.name ?? "—"}</td>
                <td>{m.tier?.name ?? "—"}</td>
                <td>{m.role.replaceAll("_", " ")}</td>
                <td>{m.status.replaceAll("_", " ")}</td>
                <td>
                  <span className={renewal.className}>{renewal.label}</span>
                </td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {m.tags.slice(0, 4).map((t) => (
                      <span
                        key={t}
                        className="text-[10px] px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                      >
                        {t}
                      </span>
                    ))}
                    {m.tags.length > 4 && (
                      <span className="text-[10px] text-[var(--color-ink-muted)]">
                        +{m.tags.length - 4}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function renewalCell(expiresAt: Date | null, now: Date): { label: string; className: string } {
  if (!expiresAt) return { label: "—", className: "text-[var(--color-ink-muted)]" };
  const days = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const iso = expiresAt.toISOString().slice(0, 10);
  if (days < 0) return { label: `lapsed ${iso}`, className: "text-red-600" };
  if (days <= 30) return { label: `${iso} (${days}d)`, className: "text-amber-600" };
  if (days <= 90) return { label: `${iso} (${days}d)`, className: "text-yellow-600" };
  return { label: iso, className: "text-[var(--color-ink-muted)]" };
}
