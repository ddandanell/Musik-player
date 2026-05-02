import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function MotionsPage({
  params,
}: {
  params: Promise<{ chamberSlug: string }>;
}) {
  const { chamberSlug } = await params;
  const session = await requireSession();
  const chamber = await prisma.chamber.findUnique({
    where: { slug: chamberSlug },
    select: { id: true },
  });
  if (!chamber) notFound();
  if (!hasChamberRole(session, chamber.id, "BOARD_MEMBER")) {
    redirect(`/c/${chamberSlug}`);
  }

  const motions = await prisma.motion.findMany({
    where: { chamberId: chamber.id },
    include: { votes: { select: { choice: true } } },
    orderBy: [{ status: "asc" }, { openedAt: "desc" }],
  });

  const grouped = {
    OPEN: motions.filter((m) => m.status === "OPEN"),
    PASSED: motions.filter((m) => m.status === "PASSED"),
    REJECTED: motions.filter((m) => m.status === "REJECTED"),
    WITHDRAWN: motions.filter((m) => m.status === "WITHDRAWN"),
  } as const;

  return (
    <div>
      <header className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">Motions</h1>
          <p className="text-[var(--color-ink-muted)] mt-2 text-sm">
            {motions.length} total · {grouped.OPEN.length} open
          </p>
        </div>
        <Link
          href={`/c/${chamberSlug}/board/motions/new`}
          className="rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-4 py-2 text-sm"
        >
          Propose motion
        </Link>
      </header>

      {(["OPEN", "PASSED", "REJECTED", "WITHDRAWN"] as const).map((bucket) => {
        const items = grouped[bucket];
        if (items.length === 0) return null;
        return (
          <section key={bucket} className="mt-10">
            <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--color-ink-muted)]">
              {bucket.toLowerCase()}
            </h2>
            <ul className="mt-3 divide-y divide-[var(--color-line)]">
              {items.map((m) => {
                const yes = m.votes.filter((v) => v.choice === "YES").length;
                const no = m.votes.filter((v) => v.choice === "NO").length;
                const abstain = m.votes.filter((v) => v.choice === "ABSTAIN").length;
                return (
                  <li key={m.id} className="py-4">
                    <Link
                      href={`/c/${chamberSlug}/board/motions/${m.id}`}
                      className="font-[family-name:var(--font-display)] text-lg hover:underline"
                    >
                      {m.title}
                    </Link>
                    <p className="text-xs text-[var(--color-ink-muted)] mt-1">
                      Quorum {m.quorum} · YES {yes} · NO {no} · ABSTAIN {abstain}
                      {m.closedAt
                        ? ` · closed ${m.closedAt.toISOString().slice(0, 10)}`
                        : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {motions.length === 0 && (
        <div className="mt-10 rounded-[var(--radius-card)] border border-dashed border-[var(--color-line)] p-10 text-center text-sm text-[var(--color-ink-muted)]">
          No motions yet.
        </div>
      )}
    </div>
  );
}
