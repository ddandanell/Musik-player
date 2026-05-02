import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "For chambers — DanChamp",
  description:
    "Run your business chamber on one platform. Members, events, payments, board governance, communication and reporting consolidated.",
};

const VALUE_PROPS = [
  {
    title: "Replace the spreadsheet stack",
    body: "One member database, one event system, one billing engine. No more Excel, free Mailchimp, Facebook events and hand-written invoices.",
  },
  {
    title: "Make renewals defensible",
    body: "Quarterly value reports go to every corporate contact automatically. The renewal conversation has data behind it.",
  },
  {
    title: "Grow beyond your network",
    body: "SEO-indexed public layer turns Google searches into free profiles, free profiles into paid members.",
  },
];

const PHASES = [
  {
    label: "Phase 1 — MVP",
    duration: "Months 1–6",
    items: [
      "Member database & profiles",
      "Event system with paid tickets",
      "Online payment via Xendit",
      "Email + WhatsApp notifications",
      "Corporate dashboard v1",
    ],
  },
  {
    label: "Phase 2 — Expansion",
    duration: "Months 7–12",
    items: [
      "Marketplace + featured listings",
      "Knowledge library & forum",
      "Mentorship pairing",
      "Quarterly report engine + auto-renewal",
      "Sponsor placement & delivery reports",
    ],
  },
  {
    label: "Phase 3 — Scale",
    duration: "Months 13–18+",
    items: [
      "Multi-chamber federation",
      "White-label per-chamber domains",
      "Mobile app",
      "AI-assisted matching",
      "Cross-chamber events",
    ],
  },
];

export default function ForChambersPage() {
  return (
    <>
      <section
        aria-labelledby="for-hero"
        className="border-b border-[var(--color-line)]"
      >
        <div className="mx-auto max-w-5xl px-6 pt-24 pb-20">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-accent)]">
            For chambers
          </p>
          <h1
            id="for-hero"
            className="mt-4 font-[family-name:var(--font-display)] text-[clamp(2.75rem,1rem+5vw,5.5rem)] leading-[1] tracking-tight"
          >
            Stop running your<br />
            <span className="italic text-[var(--color-ink-muted)]">chamber out of inboxes.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg text-[var(--color-ink-muted)]">
            DanChamp is the operating system for chambers and member organisations.
            Members, board governance, events, payments, communication and reporting in one
            platform — controlled by clear role hierarchy.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/for-chambers/pricing"
              className="rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-6 py-3"
            >
              See pricing
            </Link>
            <Link
              href="/about"
              className="rounded-[var(--radius-pill)] border border-[var(--color-line)] px-6 py-3 hover:border-[var(--color-ink)]"
            >
              About DanChamp
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-24">
        <h2 className="font-[family-name:var(--font-display)] text-4xl tracking-tight">
          Three problems we fix
        </h2>
        <ul className="mt-10 grid gap-4 sm:grid-cols-3">
          {VALUE_PROPS.map((v) => (
            <li
              key={v.title}
              className="rounded-[var(--radius-card)] border border-[var(--color-line)] p-6"
            >
              <p className="font-[family-name:var(--font-display)] text-xl">{v.title}</p>
              <p className="mt-3 text-sm text-[var(--color-ink-muted)]">{v.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-[var(--color-line)]">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <h2 className="font-[family-name:var(--font-display)] text-4xl tracking-tight">
            Built in three phases
          </h2>
          <p className="mt-4 text-[var(--color-ink-muted)] max-w-2xl">
            Discipline on phasing protects the budget. Phase 1 is the operating MVP.
            Phase 2 expands engagement. Phase 3 scales beyond a single chamber.
          </p>
          <ol className="mt-10 grid gap-6 sm:grid-cols-3">
            {PHASES.map((p) => (
              <li
                key={p.label}
                className="rounded-[var(--radius-card)] border border-[var(--color-line)] p-6"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-accent)]">
                  {p.duration}
                </p>
                <p className="font-[family-name:var(--font-display)] text-xl mt-2">
                  {p.label}
                </p>
                <ul className="mt-4 space-y-1 text-sm text-[var(--color-ink-muted)] list-disc list-inside">
                  {p.items.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
