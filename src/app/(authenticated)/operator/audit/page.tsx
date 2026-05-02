import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

export default async function OperatorAuditPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const chamberFilter = typeof sp.chamber === "string" && sp.chamber.trim() !== "" ? sp.chamber.trim() : null;

  const filterChamber = chamberFilter
    ? await prisma.chamber.findUnique({
        where: { slug: chamberFilter },
        select: { id: true, slug: true, name: true },
      })
    : null;

  const where = filterChamber ? { chamberId: filterChamber.id } : {};

  const [entries, chambers] = await Promise.all([
    prisma.auditEntry
      .findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
        include: {
          chamber: { select: { name: true, slug: true } },
        },
      })
      .catch(() => []),
    prisma.chamber
      .findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true } })
      .catch(() => []),
  ]);

  const actorIds = Array.from(new Set(entries.map((e) => e.actorUserId)));
  const actors = actorIds.length
    ? await prisma.user
        .findMany({
          where: { id: { in: actorIds } },
          select: { id: true, email: true },
        })
        .catch(() => [])
    : [];
  const actorEmail = new Map(actors.map((a) => [a.id, a.email]));

  return (
    <div>
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">Audit log</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            Last {PAGE_SIZE} entries{filterChamber ? ` for ${filterChamber.name}` : " across all chambers"}.
          </p>
        </div>
        <form className="flex items-center gap-2 text-sm">
          <label className="text-[var(--color-ink-muted)]" htmlFor="chamber">
            Chamber
          </label>
          <select
            id="chamber"
            name="chamber"
            defaultValue={chamberFilter ?? ""}
            className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            {chambers.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-3 py-1.5"
          >
            Apply
          </button>
          {chamberFilter && (
            <Link
              href="/operator/audit"
              className="text-[var(--color-ink-muted)] underline"
            >
              Clear
            </Link>
          )}
        </form>
      </header>

      <div className="mt-8 overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
      <table className="w-full text-sm min-w-[760px]">
        <thead className="text-left text-[var(--color-ink-muted)] text-xs uppercase tracking-[0.18em]">
          <tr>
            <th className="py-3">When</th>
            <th>Actor</th>
            <th>Chamber</th>
            <th>Action</th>
            <th>Target</th>
            <th>Metadata</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-line)]">
          {entries.length === 0 && (
            <tr>
              <td colSpan={6} className="py-12 text-center text-[var(--color-ink-muted)]">
                No audit entries.
              </td>
            </tr>
          )}
          {entries.map((entry) => (
            <tr key={entry.id} className="align-top">
              <td className="py-3 font-mono text-xs whitespace-nowrap">
                {entry.createdAt.toISOString().replace("T", " ").slice(0, 19)}
              </td>
              <td>{actorEmail.get(entry.actorUserId) ?? entry.actorUserId}</td>
              <td>{entry.chamber?.name ?? "—"}</td>
              <td className="font-mono text-xs">{entry.action}</td>
              <td className="font-mono text-xs break-all">{entry.target ?? "—"}</td>
              <td>
                {entry.metadata ? (
                  <details>
                    <summary className="cursor-pointer text-[var(--color-ink-muted)] text-xs">
                      View
                    </summary>
                    <pre className="mt-2 max-w-md whitespace-pre-wrap break-all rounded-md bg-[var(--color-surface-2)] p-3 text-xs">
                      {JSON.stringify(entry.metadata, null, 2)}
                    </pre>
                  </details>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
