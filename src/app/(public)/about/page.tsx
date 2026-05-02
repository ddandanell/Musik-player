import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — DanChamp",
  description:
    "DanChamp is a multi-tenant operating platform for business chambers and member organisations.",
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-2xl px-6 py-24">
      <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-accent)]">About</p>
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-5xl tracking-tight leading-[1.05]">
        We&apos;re building the operating system for business chambers.
      </h1>

      <div className="mt-10 space-y-6 text-[var(--color-ink-muted)] text-lg leading-relaxed">
        <p>
          Chambers run on volunteers, spreadsheets and good intentions. They run out of
          renewal energy when corporate sponsors can&apos;t see the value, and they cap
          their growth at the size of their existing network.
        </p>
        <p>
          DanChamp is a single platform that consolidates members, events, payments,
          governance and communication into one operating layer — and exposes a public
          community surface that turns search traffic into paying members.
        </p>
        <p>
          One chamber can run on it. Many chambers can run on the same infrastructure
          without seeing each other&apos;s data.
        </p>
      </div>

      <hr className="mt-16 border-[var(--color-line)]" />

      <p className="mt-8 text-sm text-[var(--color-ink-muted)]">
        Founded in Bali · operating across Southeast Asia
      </p>
    </article>
  );
}
