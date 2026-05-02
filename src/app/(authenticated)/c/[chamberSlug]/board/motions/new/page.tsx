import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";
import { defaultQuorum } from "@/lib/quorum";
import { createMotion } from "./actions";

export const dynamic = "force-dynamic";

export default async function NewMotionPage({
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

  const boardSize = await prisma.membership.count({
    where: { chamberId: chamber.id, status: "ACTIVE", role: "BOARD_MEMBER" },
  });
  const suggestedQuorum = defaultQuorum(boardSize);

  return (
    <div className="max-w-2xl">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-ink-muted)]">
        {chamber.name} board
      </p>
      <h1 className="font-[family-name:var(--font-display)] text-3xl mt-1">
        Propose a motion
      </h1>
      <p className="text-sm text-[var(--color-ink-muted)] mt-2">
        Board size {boardSize} · suggested quorum {suggestedQuorum}
      </p>

      <form action={createMotion} className="mt-8 space-y-5">
        <input type="hidden" name="chamberSlug" value={chamberSlug} />

        <label className="block text-sm">
          <span className="text-[var(--color-ink-muted)]">Title</span>
          <input
            name="title"
            type="text"
            required
            className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          <span className="text-[var(--color-ink-muted)]">Body</span>
          <textarea
            name="body"
            rows={8}
            required
            className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          <span className="text-[var(--color-ink-muted)]">
            Quorum (number of votes required to close)
          </span>
          <input
            name="quorum"
            type="number"
            min="1"
            defaultValue={suggestedQuorum}
            required
            className="mt-1 w-32 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"
          />
        </label>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-6 py-3 text-sm"
          >
            Open motion
          </button>
          <Link
            href={`/c/${chamberSlug}/board/motions`}
            className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
