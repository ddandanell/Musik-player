import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";
import { rsvpMeeting, saveMinutes, signMinutes } from "./actions";

export const dynamic = "force-dynamic";

type AgendaItem = { order: number; title: string };

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function parseAgenda(value: unknown): AgendaItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry, index) => {
      if (entry && typeof entry === "object") {
        const item = entry as { order?: unknown; title?: unknown };
        const order = typeof item.order === "number" ? item.order : index + 1;
        const title = typeof item.title === "string" ? item.title : "";
        if (!title) return null;
        return { order, title };
      }
      return null;
    })
    .filter((item): item is AgendaItem => item !== null);
}

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ chamberSlug: string; meetingId: string }>;
}) {
  const { chamberSlug, meetingId } = await params;
  const session = await requireSession();
  const chamber = await prisma.chamber.findUnique({
    where: { slug: chamberSlug },
    select: { id: true, name: true },
  });
  if (!chamber) notFound();
  if (!hasChamberRole(session, chamber.id, "BOARD_MEMBER")) {
    redirect(`/c/${chamberSlug}`);
  }

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      attendees: {
        orderBy: { id: "asc" },
      },
    },
  });
  if (!meeting || meeting.chamberId !== chamber.id) notFound();

  const userIds = meeting.attendees.map((a) => a.userId);
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const userById = new Map(users.map((u) => [u.id, u] as const));

  const isAdmin = hasChamberRole(session, chamber.id, "CHAMBER_ADMIN");
  const myAttendee = meeting.attendees.find((a) => a.userId === session.userId) ?? null;
  const agenda = parseAgenda(meeting.agenda);
  const isSigned = Boolean(meeting.signedAt);
  const signedBy = meeting.signedById ? await prisma.user.findUnique({
    where: { id: meeting.signedById },
    select: { name: true, email: true },
  }) : null;

  return (
    <div className="space-y-12">
      <header>
        <Link
          href={`/c/${chamberSlug}/board/meetings`}
          className="text-xs uppercase tracking-[0.2em] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
        >
          ← Meetings
        </Link>
        <div className="mt-3 flex items-baseline justify-between gap-6 flex-wrap">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl">
              {meeting.title}
            </h1>
            <p className="text-sm text-[var(--color-ink-muted)] mt-2">
              {formatDateTime(meeting.scheduledAt)}
              {meeting.location ? ` · ${meeting.location}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-[0.2em] text-[var(--color-ink-muted)]">
              {meeting.status.toLowerCase().replaceAll("_", " ")}
            </span>
            {isSigned && (
              <span className="rounded-[var(--radius-pill)] bg-[var(--color-accent)] text-[var(--color-surface)] px-3 py-1 text-[10px] uppercase tracking-[0.2em]">
                Signed
              </span>
            )}
          </div>
        </div>
      </header>

      <section>
        <h2 className="font-[family-name:var(--font-display)] text-xl">Agenda</h2>
        {agenda.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
            No agenda items recorded.
          </p>
        ) : (
          <ol className="mt-4 space-y-2">
            {agenda.map((item) => (
              <li
                key={item.order}
                className="flex gap-3 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 py-3 text-sm"
              >
                <span className="text-[var(--color-accent)] font-mono text-xs pt-0.5">
                  {String(item.order).padStart(2, "0")}
                </span>
                <span>{item.title}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <h2 className="font-[family-name:var(--font-display)] text-xl">
          Attendees ({meeting.attendees.length})
        </h2>
        <ul className="mt-4 divide-y divide-[var(--color-line)]">
          {meeting.attendees.map((a) => {
            const u = userById.get(a.userId);
            const isMe = a.userId === session.userId;
            return (
              <li key={a.id} className="py-3 flex items-center justify-between gap-4 flex-wrap">
                <span className="text-sm">
                  {u?.name ?? u?.email ?? a.userId}
                  {isMe && (
                    <span className="ml-2 text-[10px] uppercase tracking-[0.2em] text-[var(--color-accent)]">
                      You
                    </span>
                  )}
                </span>
                <span className="text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
                  {a.attendance.toLowerCase()}
                </span>
              </li>
            );
          })}
        </ul>

        {myAttendee && !isSigned && (
          <div className="mt-5 flex gap-2 flex-wrap">
            <form action={rsvpMeeting}>
              <input type="hidden" name="meetingId" value={meeting.id} />
              <input type="hidden" name="chamberSlug" value={chamberSlug} />
              <input type="hidden" name="attendance" value="ACCEPTED" />
              <button
                type="submit"
                disabled={myAttendee.attendance === "ACCEPTED"}
                className="rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-4 py-2 text-sm disabled:opacity-50"
              >
                Accept
              </button>
            </form>
            <form action={rsvpMeeting}>
              <input type="hidden" name="meetingId" value={meeting.id} />
              <input type="hidden" name="chamberSlug" value={chamberSlug} />
              <input type="hidden" name="attendance" value="DECLINED" />
              <button
                type="submit"
                disabled={myAttendee.attendance === "DECLINED"}
                className="rounded-[var(--radius-pill)] border border-[var(--color-line)] px-4 py-2 text-sm hover:border-[var(--color-ink)] disabled:opacity-50"
              >
                Decline
              </button>
            </form>
          </div>
        )}
      </section>

      <section>
        <h2 className="font-[family-name:var(--font-display)] text-xl">Minutes</h2>
        {isSigned ? (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-[var(--color-ink-muted)]">
              Signed{signedBy ? ` by ${signedBy.name ?? signedBy.email}` : ""}
              {meeting.signedAt ? ` on ${formatDateTime(meeting.signedAt)}` : ""}.
              These minutes are now read-only.
            </p>
            <div className="whitespace-pre-line rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-5 text-sm leading-relaxed">
              {meeting.minutes ?? "No minutes were recorded."}
            </div>
          </div>
        ) : isAdmin ? (
          <form action={saveMinutes} className="mt-4 space-y-4">
            <input type="hidden" name="meetingId" value={meeting.id} />
            <input type="hidden" name="chamberSlug" value={chamberSlug} />
            <textarea
              name="minutes"
              rows={14}
              defaultValue={meeting.minutes ?? ""}
              placeholder="Record what was discussed and decided..."
              className="w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm leading-relaxed"
            />
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="submit"
                className="rounded-[var(--radius-pill)] border border-[var(--color-line)] px-4 py-2 text-sm hover:border-[var(--color-ink)]"
              >
                Save minutes
              </button>
              <button
                type="submit"
                formAction={signMinutes}
                className="rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-4 py-2 text-sm"
              >
                Mark complete and sign
              </button>
              <p className="text-xs text-[var(--color-ink-muted)]">
                Signing locks minutes permanently and marks the meeting complete.
              </p>
            </div>
          </form>
        ) : (
          <p className="mt-4 text-sm text-[var(--color-ink-muted)]">
            Minutes will appear here once the meeting is completed and signed.
          </p>
        )}
      </section>
    </div>
  );
}
