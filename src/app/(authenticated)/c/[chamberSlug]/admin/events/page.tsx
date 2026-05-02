import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage({
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
  if (!hasChamberRole(session, chamber.id, "CHAMBER_ADMIN")) {
    redirect(`/c/${chamberSlug}`);
  }

  const events = await prisma.event.findMany({
    where: { chamberId: chamber.id },
    include: {
      _count: { select: { tickets: true } },
    },
    orderBy: { startsAt: "desc" },
  });

  return (
    <div>
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">Events</h1>
          <p className="text-[var(--color-ink-muted)] mt-2 text-sm">
            {events.length} total · drafts, published, cancelled, completed
          </p>
        </div>
        <Link
          href={`/c/${chamberSlug}/admin/events/new`}
          className="rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-4 py-2 text-sm"
        >
          New event
        </Link>
      </header>

      <ul className="mt-8 space-y-3">
        {events.length === 0 && (
          <li className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-line)] p-10 text-center text-sm text-[var(--color-ink-muted)]">
            No events yet. Create the first one.
          </li>
        )}
        {events.map((e) => (
          <li
            key={e.id}
            className="rounded-[var(--radius-card)] border border-[var(--color-line)] p-5"
          >
            <div className="flex items-baseline justify-between gap-4 flex-wrap">
              <div>
                <Link
                  href={`/c/${chamberSlug}/admin/events/${e.id}`}
                  className="font-[family-name:var(--font-display)] text-xl hover:underline"
                >
                  {e.title}
                </Link>
                <p className="text-xs text-[var(--color-ink-muted)] mt-1">
                  {e.startsAt.toISOString().slice(0, 16).replace("T", " ")} ·{" "}
                  {e.location ?? "no location"} · capacity {e.capacity ?? "∞"} ·{" "}
                  {e._count.tickets} ticket{e._count.tickets === 1 ? "" : "s"}
                </p>
              </div>
              <span className="text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
                {statusLabel(e.status)} · {e.visibility.replaceAll("_", " ")}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function statusLabel(status: string): string {
  return status.toLowerCase();
}
