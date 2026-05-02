import { notFound, redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AdminFinancePage({
  params,
}: {
  params: Promise<{ chamberSlug: string }>;
}) {
  const { chamberSlug } = await params;
  const session = await requireSession();
  const chamber = await prisma.chamber.findUnique({
    where: { slug: chamberSlug },
    select: { id: true, name: true, currency: true },
  });
  if (!chamber) notFound();
  if (!hasChamberRole(session, chamber.id, "CHAMBER_ADMIN")) {
    redirect(`/c/${chamberSlug}`);
  }

  const [paid, open, refunded, recent] = await Promise.all([
    prisma.invoice.aggregate({
      where: { chamberId: chamber.id, status: "PAID" },
      _sum: { amount: true },
    }),
    prisma.invoice.aggregate({
      where: { chamberId: chamber.id, status: "OPEN" },
      _sum: { amount: true },
    }),
    prisma.invoice.aggregate({
      where: { chamberId: chamber.id, status: "REFUNDED" },
      _sum: { amount: true },
    }),
    prisma.invoice.findMany({
      where: { chamberId: chamber.id },
      orderBy: { issuedAt: "desc" },
      take: 30,
      select: {
        id: true,
        number: true,
        payerEmail: true,
        amount: true,
        currency: true,
        status: true,
        issuedAt: true,
        paidAt: true,
      },
    }),
  ]);

  const totalRevenue = decimalToNumber(paid._sum.amount);
  const openAmount = decimalToNumber(open._sum.amount);
  const refundedAmount = decimalToNumber(refunded._sum.amount);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Finance</h1>
        <p className="text-[var(--color-ink-muted)] mt-2">
          Revenue, outstanding balances, and recent invoice activity for {chamber.name}.
        </p>
      </header>

      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat
          label="Revenue"
          value={formatMoney(totalRevenue, chamber.currency)}
          accent="positive"
        />
        <Stat
          label="Open"
          value={formatMoney(openAmount, chamber.currency)}
          accent="neutral"
        />
        <Stat
          label="Refunded"
          value={formatMoney(refundedAmount, chamber.currency)}
          accent="muted"
        />
      </dl>

      <section>
        <h2 className="font-[family-name:var(--font-display)] text-xl mb-4">Recent invoices</h2>
        {recent.length === 0 && (
          <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-line)] p-8 text-center text-sm text-[var(--color-ink-muted)]">
            No invoices yet.
          </div>
        )}
        {recent.length > 0 && (
          <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-line)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-surface-2)] text-left">
                <tr className="text-xs uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
                  <th className="px-4 py-3">Number</th>
                  <th className="px-4 py-3">Payer</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Issued</th>
                  <th className="px-4 py-3">Paid</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((inv) => (
                  <tr key={inv.id} className="border-t border-[var(--color-line)]">
                    <td className="px-4 py-3 font-mono text-xs">{inv.number}</td>
                    <td className="px-4 py-3">{inv.payerEmail}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatMoney(decimalToNumber(inv.amount), inv.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={inv.status} />
                    </td>
                    <td className="px-4 py-3 text-[var(--color-ink-muted)]">
                      {inv.issuedAt.toISOString().slice(0, 10)}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-ink-muted)]">
                      {inv.paidAt ? inv.paidAt.toISOString().slice(0, 10) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "positive" | "neutral" | "muted";
}) {
  const accentClass =
    accent === "positive"
      ? "text-[var(--color-accent)]"
      : accent === "muted"
        ? "text-[var(--color-ink-muted)]"
        : "text-[var(--color-ink)]";
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-5">
      <dt className="text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
        {label}
      </dt>
      <dd
        className={`font-[family-name:var(--font-display)] text-3xl mt-1 ${accentClass}`}
      >
        {value}
      </dd>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "PAID"
      ? "bg-green-50 text-green-700 border-green-200"
      : status === "OPEN"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : status === "REFUNDED"
          ? "bg-blue-50 text-blue-700 border-blue-200"
          : "bg-gray-50 text-gray-600 border-gray-200";
  return (
    <span
      className={`inline-block rounded-[var(--radius-pill)] border px-2.5 py-0.5 text-xs uppercase tracking-[0.12em] ${tone}`}
    >
      {status}
    </span>
  );
}

function decimalToNumber(value: Prisma.Decimal | null | undefined): number {
  if (!value) return 0;
  return Number(value.toString());
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("en-US")}`;
  }
}
