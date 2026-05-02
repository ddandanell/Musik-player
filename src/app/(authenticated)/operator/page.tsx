import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function OperatorOverviewPage() {
  const [chambers, members, openInvoices] = await Promise.all([
    prisma.chamber.count().catch(() => 0),
    prisma.membership.count({ where: { status: "ACTIVE" } }).catch(() => 0),
    prisma.invoice.count({ where: { status: "OPEN" } }).catch(() => 0),
  ]);

  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Platform overview</h1>
      <dl className="mt-8 grid grid-cols-3 gap-4">
        <Stat label="Chambers" value={chambers} />
        <Stat label="Active members" value={members} />
        <Stat label="Open invoices" value={openInvoices} />
      </dl>
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
