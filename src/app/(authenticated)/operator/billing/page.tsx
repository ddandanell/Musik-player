import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  slug: string;
  name: string;
  status: string;
  currency: string;
  licenseFee: number;
  txFeeBps: number;
  monthRevenue: number;
  platformFee: number;
};

export default async function OperatorBillingPage() {
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const [chambers, invoices] = await Promise.all([
    prisma.chamber
      .findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          slug: true,
          name: true,
          status: true,
          currency: true,
          licenseFee: true,
          txFeeBps: true,
          events: { select: { id: true } },
        },
      })
      .catch(() => []),
    prisma.invoice
      .findMany({
        where: {
          status: "PAID",
          paidAt: { gte: startOfMonth },
          tickets: { some: {} },
        },
        select: { chamberId: true, amount: true },
      })
      .catch(() => []),
  ]);

  const revenueByChamber = new Map<string, number>();
  for (const inv of invoices) {
    const previous = revenueByChamber.get(inv.chamberId) ?? 0;
    revenueByChamber.set(inv.chamberId, previous + Number(inv.amount.toString()));
  }

  const rows: Row[] = chambers.map((c) => {
    const monthRevenue = revenueByChamber.get(c.id) ?? 0;
    const platformFee = (monthRevenue * c.txFeeBps) / 10000;
    return {
      id: c.id,
      slug: c.slug,
      name: c.name,
      status: c.status,
      currency: c.currency,
      licenseFee: Number(c.licenseFee.toString()),
      txFeeBps: c.txFeeBps,
      monthRevenue,
      platformFee,
    };
  });

  const totals = rows.reduce(
    (acc, r) => {
      acc.licenseFee += r.licenseFee;
      acc.monthRevenue += r.monthRevenue;
      acc.platformFee += r.platformFee;
      return acc;
    },
    { licenseFee: 0, monthRevenue: 0, platformFee: 0 },
  );

  const monthLabel = startOfMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Billing</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          Per-chamber revenue and platform fees for {monthLabel}.
        </p>
      </header>

      <div className="mt-8 overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
      <table className="w-full text-sm min-w-[820px]">
        <thead className="text-left text-[var(--color-ink-muted)] text-xs uppercase tracking-[0.18em]">
          <tr>
            <th className="py-3">Slug</th>
            <th>Name</th>
            <th>Status</th>
            <th className="text-right">License fee</th>
            <th className="text-right">Tx fee</th>
            <th className="text-right">Revenue (MTD)</th>
            <th className="text-right">Platform fee</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-line)]">
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="py-12 text-center text-[var(--color-ink-muted)]">
                No chambers yet.
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="py-3 font-mono text-xs">{r.slug}</td>
              <td>{r.name}</td>
              <td>{r.status}</td>
              <td className="text-right">{formatCurrency(r.licenseFee, r.currency)}</td>
              <td className="text-right">{(r.txFeeBps / 100).toFixed(2)}%</td>
              <td className="text-right">{formatCurrency(r.monthRevenue, r.currency)}</td>
              <td className="text-right">{formatCurrency(r.platformFee, r.currency)}</td>
            </tr>
          ))}
        </tbody>
        {rows.length > 0 && (
          <tfoot className="border-t border-[var(--color-line)]">
            <tr className="text-sm">
              <td className="py-3 font-medium" colSpan={3}>
                Totals
              </td>
              <td className="text-right">{formatCurrency(totals.licenseFee, "USD")}</td>
              <td></td>
              <td className="text-right">{formatCurrency(totals.monthRevenue, "USD")}</td>
              <td className="text-right">{formatCurrency(totals.platformFee, "USD")}</td>
            </tr>
          </tfoot>
        )}
      </table>
      </div>

      <p className="mt-4 text-xs text-[var(--color-ink-muted)]">
        Totals shown in USD as a rough cross-currency reference; per-row figures use the chamber currency.
      </p>
    </div>
  );
}
