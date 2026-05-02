import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function OperatorChambersPage() {
  const chambers = await prisma.chamber
    .findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        name: true,
        country: true,
        status: true,
        createdAt: true,
        _count: { select: { memberships: true } },
      },
    })
    .catch(() => []);

  return (
    <div>
      <header className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Chambers</h1>
        <Link
          href="/operator/chambers/new"
          className="rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-4 py-2 text-sm"
        >
          Create chamber
        </Link>
      </header>

      <div className="mt-8 overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
      <table className="w-full text-sm min-w-[640px]">
        <thead className="text-left text-[var(--color-ink-muted)] text-xs uppercase tracking-[0.18em]">
          <tr>
            <th className="py-3">Slug</th>
            <th>Name</th>
            <th>Country</th>
            <th>Status</th>
            <th>Members</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-line)]">
          {chambers.length === 0 && (
            <tr>
              <td colSpan={6} className="py-12 text-center text-[var(--color-ink-muted)]">
                No chambers yet.
              </td>
            </tr>
          )}
          {chambers.map((c) => (
            <tr key={c.id}>
              <td className="py-3 font-mono text-xs">{c.slug}</td>
              <td>{c.name}</td>
              <td>{c.country}</td>
              <td>{c.status}</td>
              <td>{c._count.memberships}</td>
              <td>{c.createdAt.toISOString().slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
