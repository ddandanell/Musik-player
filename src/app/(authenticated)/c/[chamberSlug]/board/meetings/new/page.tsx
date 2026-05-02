import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";
import { scheduleMeeting } from "./actions";

export const dynamic = "force-dynamic";

export default async function NewMeetingPage({
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
  if (!hasChamberRole(session, chamber.id, "CHAMBER_ADMIN")) {
    redirect(`/c/${chamberSlug}/board/meetings`);
  }

  const boardSize = await prisma.membership.count({
    where: { chamberId: chamber.id, status: "ACTIVE", role: "BOARD_MEMBER" },
  });

  return (
    <div className="max-w-2xl">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-ink-muted)]">
        {chamber.name} board
      </p>
      <h1 className="font-[family-name:var(--font-display)] text-3xl mt-1">
        Schedule a meeting
      </h1>
      <p className="text-sm text-[var(--color-ink-muted)] mt-2">
        {boardSize} active board member{boardSize === 1 ? "" : "s"} will be invited.
      </p>

      <form action={scheduleMeeting} className="mt-8 space-y-5">
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

        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm">
            <span className="text-[var(--color-ink-muted)]">Scheduled at</span>
            <input
              name="scheduledAt"
              type="datetime-local"
              required
              className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"
            />
          </label>

          <label className="block text-sm">
            <span className="text-[var(--color-ink-muted)]">Location</span>
            <input
              name="location"
              type="text"
              placeholder="Office, Zoom URL, etc."
              className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"
            />
          </label>
        </div>

        <label className="block text-sm">
          <span className="text-[var(--color-ink-muted)]">
            Agenda items (one per line)
          </span>
          <textarea
            name="agenda"
            rows={8}
            placeholder={"Welcome and minutes from last meeting\nCEO update\nFinance review\nAOB"}
            className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 font-mono text-xs"
          />
        </label>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-6 py-3 text-sm"
          >
            Schedule and invite board
          </button>
          <Link
            href={`/c/${chamberSlug}/board/meetings`}
            className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
