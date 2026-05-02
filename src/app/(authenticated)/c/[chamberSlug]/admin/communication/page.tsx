import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";
import { BroadcastComposer } from "./composer";

export const dynamic = "force-dynamic";

type LogEntry = {
  id: string;
  channel: "EMAIL" | "WHATSAPP" | "IN_APP";
  templateKey: string | null;
  recipientEmail: string | null;
  recipientPhone: string | null;
  delivered: boolean;
  sentAt: Date;
  payload: unknown;
};

export default async function AdminCommunicationPage({
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
    redirect(`/c/${chamberSlug}`);
  }

  const logs = await prisma.communicationLog.findMany({
    where: { chamberId: chamber.id },
    orderBy: { sentAt: "desc" },
    take: 50,
    select: {
      id: true,
      channel: true,
      templateKey: true,
      recipientEmail: true,
      recipientPhone: true,
      delivered: true,
      sentAt: true,
      payload: true,
    },
  });

  const grouped = groupByDate(logs);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Communication</h1>
        <p className="text-[var(--color-ink-muted)] mt-2">
          Send a one-off email or WhatsApp message and review recent activity.
        </p>
      </header>

      <BroadcastComposer chamberSlug={chamberSlug} />

      <section>
        <h2 className="font-[family-name:var(--font-display)] text-xl mb-4">Recent activity</h2>
        {grouped.length === 0 && (
          <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-line)] p-8 text-center text-sm text-[var(--color-ink-muted)]">
            Nothing sent yet.
          </div>
        )}
        <div className="space-y-8">
          {grouped.map((group) => (
            <div key={group.date}>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-ink-muted)] mb-3">
                {group.date}
              </p>
              <ul className="space-y-2">
                {group.entries.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-start gap-4 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 py-3 text-sm"
                  >
                    <ChannelBadge channel={entry.channel} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate">
                        <span className="text-[var(--color-ink-muted)]">to</span>{" "}
                        <span className="font-mono">
                          {entry.recipientEmail ?? entry.recipientPhone ?? "—"}
                        </span>
                      </p>
                      <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                        {entry.templateKey ?? "ad-hoc"} ·{" "}
                        {new Date(entry.sentAt).toISOString().slice(11, 16)}
                      </p>
                    </div>
                    <DeliveryStatus delivered={entry.delivered} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ChannelBadge({ channel }: { channel: LogEntry["channel"] }) {
  const label =
    channel === "EMAIL" ? "Email" : channel === "WHATSAPP" ? "WhatsApp" : "In-app";
  return (
    <span className="shrink-0 rounded-[var(--radius-pill)] border border-[var(--color-line)] px-2.5 py-0.5 text-xs uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
      {label}
    </span>
  );
}

function DeliveryStatus({ delivered }: { delivered: boolean }) {
  return (
    <span
      className={
        "shrink-0 rounded-[var(--radius-pill)] px-2.5 py-0.5 text-xs " +
        (delivered
          ? "bg-green-50 text-green-700 border border-green-200"
          : "bg-red-50 text-red-700 border border-red-200")
      }
    >
      {delivered ? "Delivered" : "Failed"}
    </span>
  );
}

function groupByDate(entries: LogEntry[]): Array<{ date: string; entries: LogEntry[] }> {
  const buckets = new Map<string, LogEntry[]>();
  for (const entry of entries) {
    const date = new Date(entry.sentAt).toISOString().slice(0, 10);
    const list = buckets.get(date) ?? [];
    list.push(entry);
    buckets.set(date, list);
  }
  return Array.from(buckets.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, list]) => ({ date, entries: list }));
}
