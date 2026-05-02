import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default async function MeetingsPage({
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

  const canSchedule = hasChamberRole(session, chamber.id, "CHAMBER_ADMIN");

  const meetings = await prisma.meeting.findMany({
    where: { chamberId: chamber.id },
    include: { _count: { select: { attendees: true } } },
    orderBy: { scheduledAt: "desc" },
  });

  const upcoming = meetings.filter(
    (m) => m.status === "SCHEDULED" || m.status === "IN_PROGRESS",
  );
  const completed = meetings.filter((m) => m.status === "COMPLETED");
  const cancelled = meetings.filter((m) => m.status === "CANCELLED");

  return (
    <div>
      <header className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-ink-muted)]">
            {chamber.name} board
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl mt-1">
            Meetings
          </h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-2">
            {meetings.length} total · {upcoming.length} upcoming · {completed.length} completed
          </p>
        </div>
        {canSchedule && (
          <Link
            href={`/c/${chamberSlug}/board/meetings/new`}
            className="rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-4 py-2 text-sm"
          >
            Schedule meeting
          </Link>
        )}
      </header>

      <Section
        label="Upcoming"
        items={upcoming}
        chamberSlug={chamberSlug}
        emptyText="No upcoming meetings."
      />
      <Section
        label="Completed"
        items={completed}
        chamberSlug={chamberSlug}
        emptyText="No completed meetings."
      />
      <Section
        label="Cancelled"
        items={cancelled}
        chamberSlug={chamberSlug}
        emptyText=""
      />

      {meetings.length === 0 && (
        <div className="mt-10 rounded-[var(--radius-card)] border border-dashed border-[var(--color-line)] p-10 text-center text-sm text-[var(--color-ink-muted)]">
          No meetings yet.
        </div>
      )}
    </div>
  );
}

type MeetingRow = {
  id: string;
  title: string;
  scheduledAt: Date;
  location: string | null;
  status: string;
  signedAt: Date | null;
  _count: { attendees: number };
};

function Section({
  label,
  items,
  chamberSlug,
  emptyText,
}: {
  label: string;
  items: MeetingRow[];
  chamberSlug: string;
  emptyText: string;
}) {
  if (items.length === 0 && !emptyText) return null;
  return (
    <section className="mt-10">
      <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--color-ink-muted)]">
        {label}
      </h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--color-ink-muted)]">{emptyText}</p>
      ) : (
        <ul className="mt-3 divide-y divide-[var(--color-line)]">
          {items.map((m) => (
            <li key={m.id} className="py-4 flex items-baseline justify-between gap-6 flex-wrap">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/c/${chamberSlug}/board/meetings/${m.id}`}
                  className="font-[family-name:var(--font-display)] text-lg hover:underline"
                >
                  {m.title}
                </Link>
                <p className="text-xs text-[var(--color-ink-muted)] mt-1">
                  {formatDateTime(m.scheduledAt)}
                  {m.location ? ` · ${m.location}` : ""} ·{" "}
                  {m._count.attendees} invited
                </p>
              </div>
              {m.signedAt && (
                <span className="rounded-[var(--radius-pill)] border border-[var(--color-line)] px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  Signed
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
