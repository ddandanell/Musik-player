import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";
import {
  checkInTicket,
  undoCheckIn,
  promoteFromWaitlist,
  refundTicket,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function AttendancePage({
  params,
}: {
  params: Promise<{ chamberSlug: string; eventId: string }>;
}) {
  const { chamberSlug, eventId } = await params;
  const session = await requireSession();

  const chamber = await prisma.chamber.findUnique({
    where: { slug: chamberSlug },
    select: { id: true },
  });
  if (!chamber) notFound();
  if (!hasChamberRole(session, chamber.id, "CHAMBER_ADMIN")) {
    redirect(`/c/${chamberSlug}`);
  }

  const event = await prisma.event.findFirst({
    where: { id: eventId, chamberId: chamber.id },
    select: { id: true, title: true, startsAt: true, capacity: true, slug: true },
  });
  if (!event) notFound();

  const tickets = await prisma.ticket.findMany({
    where: { eventId: event.id },
    include: {
      user: { select: { name: true, email: true } },
      ticketType: { select: { name: true, price: true } },
      invoice: { select: { status: true, number: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });

  const counts = {
    reserved: tickets.filter((t) => t.status === "RESERVED").length,
    paid: tickets.filter((t) => t.status === "PAID").length,
    checkedIn: tickets.filter((t) => t.status === "CHECKED_IN").length,
    waitlisted: tickets.filter((t) => t.status === "WAITLISTED").length,
    refunded: tickets.filter((t) => t.status === "REFUNDED").length,
  };
  const seated = counts.reserved + counts.paid + counts.checkedIn;

  return (
    <div>
      <Link
        href={`/c/${chamberSlug}/admin/events/${event.id}`}
        className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
      >
        ← Back to event
      </Link>

      <header className="mt-4">
        <h1 className="font-[family-name:var(--font-display)] text-3xl">{event.title}</h1>
        <p className="text-[var(--color-ink-muted)] mt-1 text-sm">
          {event.startsAt.toISOString().slice(0, 16).replace("T", " ")}
          {event.capacity !== null && ` · capacity ${event.capacity}`}
        </p>
      </header>

      <dl className="mt-8 grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Stat label="Seated" value={seated} />
        <Stat label="Checked in" value={counts.checkedIn} accent />
        <Stat label="Paid" value={counts.paid} />
        <Stat label="Waitlist" value={counts.waitlisted} />
        <Stat label="Refunded" value={counts.refunded} muted />
      </dl>

      <div className="mt-10 overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
      <table className="w-full text-sm min-w-[820px]">
        <thead className="text-left text-[var(--color-ink-muted)] text-xs uppercase tracking-[0.18em]">
          <tr>
            <th className="py-3">Attendee</th>
            <th>Ticket type</th>
            <th>Status</th>
            <th>Invoice</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-line)]">
          {tickets.length === 0 && (
            <tr>
              <td colSpan={6} className="py-12 text-center text-[var(--color-ink-muted)]">
                No tickets sold yet.
              </td>
            </tr>
          )}
          {tickets.map((t) => (
            <tr key={t.id} className="align-top">
              <td className="py-3">
                <p className="font-medium">{t.user.name ?? "—"}</p>
                <p className="text-xs text-[var(--color-ink-muted)]">{t.user.email}</p>
              </td>
              <td>
                {t.ticketType.name}
                <span className="block text-xs text-[var(--color-ink-muted)]">
                  {t.ticketType.price.toString()}
                </span>
              </td>
              <td>
                <StatusBadge status={t.status} />
                {t.checkedInAt && (
                  <p className="text-xs text-[var(--color-ink-muted)] mt-1">
                    in @ {t.checkedInAt.toISOString().slice(11, 16)}
                  </p>
                )}
              </td>
              <td className="text-xs">
                {t.invoice ? (
                  <>
                    <span className="font-mono">{t.invoice.number}</span>
                    <br />
                    <span className="text-[var(--color-ink-muted)]">{t.invoice.status}</span>
                  </>
                ) : (
                  <span className="text-[var(--color-ink-muted)]">—</span>
                )}
              </td>
              <td className="text-xs text-[var(--color-ink-muted)]">
                {t.createdAt.toISOString().slice(0, 10)}
              </td>
              <td>
                <div className="flex flex-wrap gap-1">
                  {(t.status === "RESERVED" || t.status === "PAID") && (
                    <ActionButton
                      action={checkInTicket}
                      ticketId={t.id}
                      eventId={event.id}
                      chamberSlug={chamberSlug}
                      label="Check in"
                      variant="primary"
                    />
                  )}
                  {t.status === "CHECKED_IN" && (
                    <ActionButton
                      action={undoCheckIn}
                      ticketId={t.id}
                      eventId={event.id}
                      chamberSlug={chamberSlug}
                      label="Undo"
                    />
                  )}
                  {t.status === "WAITLISTED" && (
                    <ActionButton
                      action={promoteFromWaitlist}
                      ticketId={t.id}
                      eventId={event.id}
                      chamberSlug={chamberSlug}
                      label="Promote"
                      variant="primary"
                    />
                  )}
                  {t.status !== "REFUNDED" && t.invoice && (
                    <ActionButton
                      action={refundTicket}
                      ticketId={t.id}
                      eventId={event.id}
                      chamberSlug={chamberSlug}
                      label="Refund"
                      variant="danger"
                    />
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  muted,
}: {
  label: string;
  value: number;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border border-[var(--color-line)] p-4 ${
        accent ? "bg-[var(--color-accent-soft)]" : muted ? "" : "bg-[var(--color-surface-2)]"
      }`}
    >
      <dt className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-muted)]">
        {label}
      </dt>
      <dd
        className={`font-[family-name:var(--font-display)] text-3xl mt-1 ${
          accent ? "text-[var(--color-accent)]" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const style: Record<string, string> = {
    CHECKED_IN: "bg-[var(--color-accent-soft)] text-[var(--color-accent)]",
    PAID: "bg-emerald-50 text-emerald-700",
    RESERVED: "bg-amber-50 text-amber-700",
    WAITLISTED: "bg-yellow-50 text-yellow-700",
    REFUNDED: "bg-neutral-100 text-neutral-500 line-through",
  };
  return (
    <span
      className={`text-xs px-2 py-1 rounded-[var(--radius-pill)] ${style[status] ?? ""}`}
    >
      {status.replaceAll("_", " ").toLowerCase()}
    </span>
  );
}

function ActionButton({
  action,
  ticketId,
  eventId,
  chamberSlug,
  label,
  variant = "ghost",
}: {
  action: (formData: FormData) => Promise<void>;
  ticketId: string;
  eventId: string;
  chamberSlug: string;
  label: string;
  variant?: "primary" | "danger" | "ghost";
}) {
  const cls =
    variant === "primary"
      ? "bg-[var(--color-ink)] text-[var(--color-surface)]"
      : variant === "danger"
        ? "border border-[var(--color-line)] text-red-600 hover:border-red-600"
        : "border border-[var(--color-line)] hover:border-[var(--color-ink)]";
  return (
    <form action={action}>
      <input type="hidden" name="ticketId" value={ticketId} />
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="chamberSlug" value={chamberSlug} />
      <button
        type="submit"
        className={`rounded-[var(--radius-pill)] px-3 py-1 text-xs ${cls}`}
      >
        {label}
      </button>
    </form>
  );
}
