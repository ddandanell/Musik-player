import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";
import { declareConflict } from "./actions";

export const dynamic = "force-dynamic";

export default async function DeclareConflictPage({
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

  return (
    <div className="max-w-2xl">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-ink-muted)]">
        {chamber.name} board
      </p>
      <h1 className="font-[family-name:var(--font-display)] text-3xl mt-1">
        Declare a conflict of interest
      </h1>
      <p className="text-sm text-[var(--color-ink-muted)] mt-2">
        Provide enough context for the board to evaluate and document the conflict.
      </p>

      <form action={declareConflict} className="mt-8 space-y-5">
        <input type="hidden" name="chamberSlug" value={chamberSlug} />

        <label className="block text-sm">
          <span className="text-[var(--color-ink-muted)]">Subject</span>
          <input
            name="subject"
            type="text"
            required
            placeholder="e.g. Vendor selection — Acme Logistics"
            className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          <span className="text-[var(--color-ink-muted)]">Details</span>
          <textarea
            name="details"
            rows={8}
            required
            placeholder="Describe the nature of the conflict, parties involved, and any mitigation."
            className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"
          />
        </label>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-6 py-3 text-sm"
          >
            Submit declaration
          </button>
          <Link
            href={`/c/${chamberSlug}/board/coi`}
            className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
