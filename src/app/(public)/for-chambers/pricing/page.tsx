import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing — DanChamp",
  description: "Per-chamber license fee plus a transparent transaction fee on event ticket revenue.",
};

const TIERS = [
  {
    name: "Pilot",
    price: "Free",
    period: "first 6 months",
    features: [
      "Full platform — every module",
      "Up to 100 members",
      "Email + WhatsApp send capped at 5,000/month",
      "Standard 5% transaction fee",
    ],
    cta: "Apply for the pilot",
  },
  {
    name: "Operating",
    price: "USD 750",
    period: "per chamber per month",
    features: [
      "Unlimited members",
      "Unlimited send (Meta + email caps still apply)",
      "Standard 5% transaction fee",
      "Quarterly corporate value reports",
      "Priority support",
    ],
    cta: "Talk to us",
    featured: true,
  },
  {
    name: "Federation",
    price: "Custom",
    period: "for 5+ chambers",
    features: [
      "All Operating features",
      "White-label per-chamber domains",
      "Cross-chamber event ticketing",
      "Reduced transaction fee (3%)",
      "Dedicated infra region",
    ],
    cta: "Contact sales",
  },
];

export default function PricingPage() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-24">
      <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-accent)]">
        Pricing
      </p>
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-[clamp(2.5rem,1rem+4vw,4.5rem)] tracking-tight leading-[1]">
        Pay for the operating layer.
        <br />
        <span className="italic text-[var(--color-ink-muted)]">
          Take a small cut of revenue you create.
        </span>
      </h1>

      <ul className="mt-16 grid gap-4 sm:grid-cols-3">
        {TIERS.map((t) => (
          <li
            key={t.name}
            className={`rounded-[var(--radius-card)] border p-6 ${
              t.featured
                ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-surface)]"
                : "border-[var(--color-line)]"
            }`}
          >
            <p
              className={`text-xs uppercase tracking-[0.18em] ${
                t.featured ? "text-[var(--color-surface)]/80" : "text-[var(--color-ink-muted)]"
              }`}
            >
              {t.name}
            </p>
            <p className="font-[family-name:var(--font-display)] text-3xl mt-3">
              {t.price}
            </p>
            <p
              className={`text-xs mt-1 ${
                t.featured ? "text-[var(--color-surface)]/70" : "text-[var(--color-ink-muted)]"
              }`}
            >
              {t.period}
            </p>
            <ul className="mt-6 space-y-2 text-sm">
              {t.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <Link
              href="/for-chambers"
              className={`mt-6 inline-block rounded-[var(--radius-pill)] px-4 py-2 text-sm ${
                t.featured
                  ? "bg-[var(--color-surface)] text-[var(--color-ink)]"
                  : "bg-[var(--color-ink)] text-[var(--color-surface)]"
              }`}
            >
              {t.cta}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
