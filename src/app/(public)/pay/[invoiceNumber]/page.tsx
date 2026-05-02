import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PayInvoicePage({
  params,
}: {
  params: Promise<{ invoiceNumber: string }>;
}) {
  const { invoiceNumber } = await params;
  const token = decodeURIComponent(invoiceNumber);

  const invoice = await prisma.invoice.findFirst({
    where: { OR: [{ id: token }, { number: token }] },
    include: { chamber: { select: { name: true, slug: true } } },
  });
  if (!invoice) notFound();

  const amount = Number(invoice.amount.toString());
  const issuedAt = invoice.issuedAt.toISOString().slice(0, 10);
  const paidAt = invoice.paidAt?.toISOString().slice(0, 10);

  return (
    <section className="mx-auto max-w-xl px-6 py-24">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-accent)]">
        {invoice.chamber.name}
      </p>
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight mt-2">
        Invoice {invoice.number}
      </h1>

      <dl className="mt-10 grid grid-cols-2 gap-y-4 text-sm">
        <dt className="text-[var(--color-ink-muted)]">Description</dt>
        <dd>{invoice.description ?? "—"}</dd>
        <dt className="text-[var(--color-ink-muted)]">Amount</dt>
        <dd className="font-[family-name:var(--font-display)] text-2xl">
          {formatCurrency(amount, invoice.currency)}
        </dd>
        <dt className="text-[var(--color-ink-muted)]">Issued</dt>
        <dd>{issuedAt}</dd>
        <dt className="text-[var(--color-ink-muted)]">Status</dt>
        <dd>
          <StatusPill status={invoice.status} />
        </dd>
      </dl>

      <div className="mt-10">
        {invoice.status === "OPEN" && invoice.paymentUrl && (
          <a
            href={invoice.paymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-6 py-3 text-sm"
          >
            Pay invoice
          </a>
        )}
        {invoice.status === "OPEN" && !invoice.paymentUrl && (
          <p className="rounded-[var(--radius-card)] border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
            Payment link not yet generated — contact {invoice.chamber.name} to retry.
          </p>
        )}
        {invoice.status === "PAID" && (
          <p className="rounded-[var(--radius-card)] border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
            Paid {paidAt ?? "successfully"}. Thank you.
          </p>
        )}
        {invoice.status === "VOIDED" && (
          <p className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4 text-sm text-[var(--color-ink-muted)]">
            This invoice has been voided.
          </p>
        )}
        {invoice.status === "REFUNDED" && (
          <p className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4 text-sm text-[var(--color-ink-muted)]">
            This invoice has been refunded.
          </p>
        )}
      </div>
    </section>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "PAID"
      ? "bg-emerald-100 text-emerald-800"
      : status === "OPEN"
        ? "bg-amber-100 text-amber-800"
        : "bg-[var(--color-surface-2)] text-[var(--color-ink-muted)]";
  return (
    <span
      className={`inline-block rounded-[var(--radius-pill)] px-3 py-1 text-xs uppercase tracking-[0.18em] ${tone}`}
    >
      {status}
    </span>
  );
}
