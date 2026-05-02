import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type DbStatus = { ok: true } | { ok: false; error: string };

async function pingDatabase(): Promise<DbStatus> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export default async function OperatorHealthPage() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [activeChambers, suspendedChambers, activeMembers, channelGroups, failed24h, dbStatus] =
    await Promise.all([
      prisma.chamber.count({ where: { status: "ACTIVE" } }).catch(() => 0),
      prisma.chamber.count({ where: { status: "SUSPENDED" } }).catch(() => 0),
      prisma.membership.count({ where: { status: "ACTIVE" } }).catch(() => 0),
      prisma.communicationLog
        .groupBy({
          by: ["channel"],
          where: { sentAt: { gte: oneDayAgo } },
          _count: { _all: true },
        })
        .catch(() => [] as Array<{ channel: string; _count: { _all: number } }>),
      prisma.communicationLog
        .count({ where: { sentAt: { gte: oneDayAgo }, delivered: false } })
        .catch(() => 0),
      pingDatabase(),
    ]);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Health</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          Live snapshot of platform-wide signals.
        </p>
      </header>

      <section>
        <h2 className="text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
          Tenants
        </h2>
        <dl className="mt-4 grid grid-cols-3 gap-4">
          <Stat label="Active chambers" value={activeChambers} />
          <Stat label="Suspended chambers" value={suspendedChambers} />
          <Stat label="Active members" value={activeMembers} />
        </dl>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
          Communications (last 24h)
        </h2>
        <dl className="mt-4 grid grid-cols-3 gap-4">
          {(["EMAIL", "WHATSAPP", "IN_APP"] as const).map((channel) => {
            const found = channelGroups.find((g) => g.channel === channel);
            return <Stat key={channel} label={channel} value={found?._count._all ?? 0} />;
          })}
        </dl>
        <p className="mt-3 text-sm">
          <span className="text-[var(--color-ink-muted)]">Failed deliveries (24h): </span>
          <span className={failed24h > 0 ? "text-red-700 font-medium" : ""}>{failed24h}</span>
        </p>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
          Connections
        </h2>
        <p className="mt-4 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4 text-sm">
          {dbStatus.ok ? (
            <>
              <span className="font-medium text-emerald-700">DB: OK</span>
              <span className="text-[var(--color-ink-muted)]"> · SELECT 1 returned successfully</span>
            </>
          ) : (
            <>
              <span className="font-medium text-red-700">DB: ERROR</span>
              <span className="text-[var(--color-ink-muted)]"> · {dbStatus.error}</span>
            </>
          )}
        </p>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-6">
      <dt className="text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
        {label}
      </dt>
      <dd className="font-[family-name:var(--font-display)] text-4xl mt-2">{value}</dd>
    </div>
  );
}
