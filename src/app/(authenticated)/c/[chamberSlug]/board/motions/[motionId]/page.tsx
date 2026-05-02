import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";
import { castVote, withdrawMotion } from "./actions";

export const dynamic = "force-dynamic";

export default async function MotionDetailPage({
  params,
}: {
  params: Promise<{ chamberSlug: string; motionId: string }>;
}) {
  const { chamberSlug, motionId } = await params;
  const session = await requireSession();
  const chamber = await prisma.chamber.findUnique({
    where: { slug: chamberSlug },
    select: { id: true },
  });
  if (!chamber) notFound();
  if (!hasChamberRole(session, chamber.id, "BOARD_MEMBER")) {
    redirect(`/c/${chamberSlug}`);
  }

  const motion = await prisma.motion.findUnique({
    where: { id: motionId },
    include: {
      votes: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { castAt: "asc" },
      },
    },
  });
  if (!motion || motion.chamberId !== chamber.id) notFound();

  const proposer = await prisma.user.findUnique({
    where: { id: motion.proposedBy },
    select: { name: true, email: true },
  });

  const yes = motion.votes.filter((v) => v.choice === "YES").length;
  const no = motion.votes.filter((v) => v.choice === "NO").length;
  const abstain = motion.votes.filter((v) => v.choice === "ABSTAIN").length;
  const total = yes + no + abstain;

  const myVote = motion.votes.find((v) => v.userId === session.userId);
  const isAdmin = hasChamberRole(session, chamber.id, "CHAMBER_ADMIN");
  const canWithdraw =
    motion.status === "OPEN" && (motion.proposedBy === session.userId || isAdmin);

  return (
    <article className="max-w-3xl">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-ink-muted)]">
        {motion.status}
        {motion.closedAt
          ? ` · closed ${motion.closedAt.toISOString().slice(0, 10)}`
          : ` · opened ${motion.openedAt.toISOString().slice(0, 10)}`}
      </p>
      <h1 className="font-[family-name:var(--font-display)] text-3xl mt-1">
        {motion.title}
      </h1>
      <p className="text-sm text-[var(--color-ink-muted)] mt-1">
        Proposed by {proposer?.name ?? proposer?.email ?? "—"}
      </p>

      <p className="mt-6 whitespace-pre-line">{motion.body}</p>

      <section className="mt-10 grid grid-cols-4 gap-4">
        <Tally label="Yes" value={yes} />
        <Tally label="No" value={no} />
        <Tally label="Abstain" value={abstain} />
        <Tally label={`Quorum ${motion.quorum}`} value={total} />
      </section>

      {motion.status === "OPEN" && (
        <section className="mt-10">
          <h2 className="font-[family-name:var(--font-display)] text-xl">
            {myVote ? "Your vote" : "Cast your vote"}
          </h2>
          {myVote ? (
            <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
              You voted {myVote.choice}.
            </p>
          ) : (
            <div className="mt-4 flex gap-2 flex-wrap">
              {(["YES", "NO", "ABSTAIN"] as const).map((choice) => (
                <form key={choice} action={castVote}>
                  <input type="hidden" name="motionId" value={motion.id} />
                  <input type="hidden" name="chamberSlug" value={chamberSlug} />
                  <input type="hidden" name="choice" value={choice} />
                  <button
                    type="submit"
                    className="rounded-[var(--radius-pill)] border border-[var(--color-line)] px-4 py-2 text-sm hover:border-[var(--color-ink)]"
                  >
                    {choice}
                  </button>
                </form>
              ))}
            </div>
          )}
        </section>
      )}

      {canWithdraw && (
        <form action={withdrawMotion} className="mt-8">
          <input type="hidden" name="motionId" value={motion.id} />
          <input type="hidden" name="chamberSlug" value={chamberSlug} />
          <button
            type="submit"
            className="text-sm text-red-600 hover:underline"
          >
            Withdraw motion
          </button>
        </form>
      )}

      {motion.votes.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
            Vote log
          </h2>
          <ul className="mt-3 divide-y divide-[var(--color-line)] text-sm">
            {motion.votes.map((v) => (
              <li key={v.id} className="py-2 flex justify-between">
                <span>{v.user.name ?? v.user.email}</span>
                <span className="text-[var(--color-ink-muted)]">{v.choice}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

function Tally({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
        {label}
      </p>
      <p className="font-[family-name:var(--font-display)] text-2xl mt-1">{value}</p>
    </div>
  );
}
