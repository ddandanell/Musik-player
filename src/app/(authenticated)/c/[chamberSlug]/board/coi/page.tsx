import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";
import { markResolved } from "./actions";

export const dynamic = "force-dynamic";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default async function ConflictRegisterPage({
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
  if (!hasChamberRole(session, chamber.id, "BOARD_MEMBER")) {
    redirect(`/c/${chamberSlug}`);
  }

  const declarations = await prisma.conflictDeclaration.findMany({
    where: { chamberId: chamber.id },
    orderBy: [{ resolvedAt: "asc" }, { declaredAt: "desc" }],
  });

  const declarerIds = Array.from(new Set(declarations.map((d) => d.declaredBy)));
  const declarers = declarerIds.length
    ? await prisma.user.findMany({
        where: { id: { in: declarerIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const userById = new Map(declarers.map((u) => [u.id, u] as const));

  const open = declarations.filter((d) => !d.resolvedAt);
  const resolved = declarations.filter((d) => d.resolvedAt);

  return (
    <div>
      <header className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-ink-muted)]">
            {chamber.name} board
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl mt-1">
            Conflict-of-interest register
          </h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-2">
            {open.length} open · {resolved.length} resolved
          </p>
        </div>
        <Link
          href={`/c/${chamberSlug}/board/coi/new`}
          className="rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-4 py-2 text-sm"
        >
          Declare a conflict
        </Link>
      </header>

      {declarations.length === 0 && (
        <div className="mt-10 rounded-[var(--radius-card)] border border-dashed border-[var(--color-line)] p-10 text-center text-sm text-[var(--color-ink-muted)]">
          No conflicts have been declared.
        </div>
      )}

      {open.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--color-ink-muted)]">
            Open
          </h2>
          <ul className="mt-3 space-y-3">
            {open.map((d) => {
              const u = userById.get(d.declaredBy);
              return (
                <li
                  key={d.id}
                  className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-5"
                >
                  <div className="flex items-baseline justify-between gap-4 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-[family-name:var(--font-display)] text-lg">
                        {d.subject}
                      </h3>
                      <p className="text-xs text-[var(--color-ink-muted)] mt-1">
                        {u?.name ?? u?.email ?? d.declaredBy} · declared {formatDate(d.declaredAt)}
                      </p>
                    </div>
                    <form action={markResolved}>
                      <input type="hidden" name="id" value={d.id} />
                      <input type="hidden" name="chamberSlug" value={chamberSlug} />
                      <button
                        type="submit"
                        className="rounded-[var(--radius-pill)] border border-[var(--color-line)] px-3 py-1.5 text-xs hover:border-[var(--color-ink)]"
                      >
                        Mark resolved
                      </button>
                    </form>
                  </div>
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">
                    {d.details}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {resolved.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--color-ink-muted)]">
            Resolved
          </h2>
          <ul className="mt-3 divide-y divide-[var(--color-line)]">
            {resolved.map((d) => {
              const u = userById.get(d.declaredBy);
              return (
                <li key={d.id} className="py-4">
                  <div className="flex items-baseline justify-between gap-4 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-[family-name:var(--font-display)] text-base">
                        {d.subject}
                      </h3>
                      <p className="text-xs text-[var(--color-ink-muted)] mt-1">
                        {u?.name ?? u?.email ?? d.declaredBy} · declared{" "}
                        {formatDate(d.declaredAt)} · resolved {formatDate(d.resolvedAt!)}
                      </p>
                    </div>
                    <span className="rounded-[var(--radius-pill)] border border-[var(--color-line)] px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[var(--color-accent)]">
                      Resolved
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm text-[var(--color-ink-muted)] leading-relaxed">
                    {d.details}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
