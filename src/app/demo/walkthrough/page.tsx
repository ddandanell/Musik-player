import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { isDemoMode } from "@/lib/auth/session";
import { enterDemo } from "../actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Guided tours · DanChamp demo",
  description: "Walk through the platform from five different perspectives.",
};

type Tour = {
  key: string;
  badge: string;
  title: string;
  hook: string;
  story: string;
  selectPersona: () => Promise<{ id: string; name: string | null; email: string } | null>;
  steps: (slug: string) => Array<{ label: string; href: string; tip: string }>;
};

async function pickFirstByRole(role: "CHAMBER_ADMIN" | "BOARD_MEMBER" | "CORPORATE_CONTACT" | "BUSINESS_MEMBER", chamberSlug?: string) {
  const m = await prisma.membership.findFirst({
    where: {
      role,
      status: "ACTIVE",
      ...(chamberSlug ? { chamber: { slug: chamberSlug } } : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      chamber: { select: { slug: true } },
    },
  });
  return m ? { ...m.user, chamberSlug: m.chamber.slug } : null;
}

async function pickOperator() {
  const u = await prisma.user.findFirst({
    where: { platformRole: "OPERATOR" },
    select: { id: true, name: true, email: true },
  });
  return u ? { ...u, chamberSlug: undefined as string | undefined } : null;
}

export default async function WalkthroughPage() {
  if (!isDemoMode()) notFound();

  const [applicant, corporate, board, admin, operator] = await Promise.all([
    pickFirstByRole("BUSINESS_MEMBER"),
    pickFirstByRole("CORPORATE_CONTACT"),
    pickFirstByRole("BOARD_MEMBER"),
    pickFirstByRole("CHAMBER_ADMIN"),
    pickOperator(),
  ]);

  const tours: Array<{
    key: string;
    badge: string;
    title: string;
    hook: string;
    story: string;
    persona: { id: string; name: string | null; chamberSlug: string | undefined } | null;
    steps: Array<{ label: string; href: string; tip: string }>;
  }> = [
    {
      key: "applicant",
      badge: "The new arrival",
      title: "Sofia finds DanChamp, applies, joins her first event",
      hook: "How the public-to-paid conversion funnel actually works.",
      story:
        "Sofia just moved to Jakarta and Googled 'Danish business community Indonesia.' Watch her arrive on the public layer, apply, get approved, and book her first event.",
      persona: applicant ? { id: applicant.id, name: applicant.name, chamberSlug: applicant.chamberSlug } : null,
      steps: applicant
        ? [
            { label: "1. The public landing", href: "/", tip: "SEO-indexed marketing surface." },
            { label: "2. The chamber's public face", href: `/c/${applicant.chamberSlug}`, tip: "Hero, upcoming events, public articles." },
            { label: "3. Apply for membership", href: `/c/${applicant.chamberSlug}/apply`, tip: "Public form, lands in admin queue." },
            { label: "4. Member dashboard once approved", href: "/me", tip: "Personal view of all chamber memberships." },
            { label: "5. Browse upcoming events", href: `/c/${applicant.chamberSlug}/events`, tip: "Members-only + public events." },
          ]
        : [],
    },
    {
      key: "corporate",
      badge: "The sponsor",
      title: "Lars decides whether to renew Novo Nordisk's seat",
      hook: "The retention feature that fixes the largest churn driver in chambers.",
      story:
        "Lars Petersen runs Novo Nordisk's chamber relationship. Renewal is in three weeks and his finance director wants to see what they got. Walk through his dashboard and the auto-generated quarterly value report.",
      persona: corporate ? { id: corporate.id, name: corporate.name, chamberSlug: corporate.chamberSlug } : null,
      steps: corporate
        ? [
            { label: "1. Corporate dashboard", href: `/c/${corporate.chamberSlug}/corporate`, tip: "Per-company employee roll-up." },
            { label: "2. Quarterly value report", href: `/c/${corporate.chamberSlug}/corporate/report/${currentQuarterParam()}`, tip: "Print-ready, sent automatically each quarter." },
            { label: "3. Browse the directory", href: `/c/${corporate.chamberSlug}/directory`, tip: "Confirm peer companies are still here." },
          ]
        : [],
    },
    {
      key: "board",
      badge: "The governor",
      title: "Åse votes on three open motions",
      hook: "Board governance without PDFs in email threads.",
      story:
        "Åse sits on the chamber board. Three motions are open — one budget, one new sponsor, one membership escalation. See the motions list, cast a vote, watch auto-quorum close the motion.",
      persona: board ? { id: board.id, name: board.name, chamberSlug: board.chamberSlug } : null,
      steps: board
        ? [
            { label: "1. Board workspace", href: `/c/${board.chamberSlug}/board`, tip: "Open motions + escalated applications." },
            { label: "2. Motions list", href: `/c/${board.chamberSlug}/board/motions`, tip: "Grouped by status with vote tallies." },
            { label: "3. Propose a new motion", href: `/c/${board.chamberSlug}/board/motions/new`, tip: "Quorum auto-suggested from board size." },
          ]
        : [],
    },
    {
      key: "admin",
      badge: "The operator",
      title: "Mikkel runs the chamber day to day",
      hook: "What replaces the volunteer-run spreadsheet stack.",
      story:
        "Mikkel is the chamber administrator. In one morning he approves an application, creates next month's networking event, checks who's RSVPed, sends a WhatsApp reminder. All from one screen.",
      persona: admin ? { id: admin.id, name: admin.name, chamberSlug: admin.chamberSlug } : null,
      steps: admin
        ? [
            { label: "1. Admin overview", href: `/c/${admin.chamberSlug}/admin`, tip: "Pending applications, upcoming events, open invoices." },
            { label: "2. Members with search + filter", href: `/c/${admin.chamberSlug}/admin/members`, tip: "Tag, filter, export to CSV." },
            { label: "3. Applications queue", href: `/c/${admin.chamberSlug}/admin/applications`, tip: "Approve / send to board / reject." },
            { label: "4. Events", href: `/c/${admin.chamberSlug}/admin/events`, tip: "Create, publish, manage attendance." },
            { label: "5. Communication composer", href: `/c/${admin.chamberSlug}/admin/communication`, tip: "Email + WhatsApp + history log." },
            { label: "6. Finance overview", href: `/c/${admin.chamberSlug}/admin/finance`, tip: "Revenue, open invoices, refunds." },
          ]
        : [],
    },
    {
      key: "operator",
      badge: "The platform",
      title: "From the operator console",
      hook: "How the multi-tenant operating company runs the network.",
      story:
        "You own DanChamp Platform. Four chambers run on it. See the cross-chamber view: provisioning new tenants, billing, system health, and the platform-wide audit trail.",
      persona: operator ? { id: operator.id, name: operator.name, chamberSlug: undefined } : null,
      steps: operator
        ? [
            { label: "1. Operator overview", href: "/operator", tip: "Cross-chamber stats." },
            { label: "2. Chambers", href: "/operator/chambers", tip: "Provision, suspend, edit." },
            { label: "3. Billing", href: "/operator/billing", tip: "Per-chamber MTD revenue + platform fee." },
            { label: "4. Health", href: "/operator/health", tip: "DB ping, delivery failures, send volume." },
            { label: "5. Audit log", href: "/operator/audit", tip: "Every admin action, filterable." },
          ]
        : [],
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <header className="border-b border-[var(--color-line)]">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Guided tours
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-[clamp(2.5rem,1rem+4vw,4.5rem)] leading-[1] tracking-tight">
            Five narratives.
            <br />
            <span className="italic text-[var(--color-ink-muted)]">One platform.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-[var(--color-ink-muted)]">
            Each tour signs you in as a specific persona and walks you through the screens
            they actually use in production. Click any tour to start.
          </p>
          <p className="mt-8 text-xs text-[var(--color-ink-muted)]">
            <Link href="/demo" className="underline">
              Or pick any persona manually →
            </Link>
          </p>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-5xl px-6 py-16 space-y-12">
        {tours.map((t) => (
          <article
            key={t.key}
            className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-8"
          >
            <header>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-accent)]">
                {t.badge}
              </p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl">
                {t.title}
              </h2>
              <p className="mt-3 text-[var(--color-ink-muted)] max-w-2xl">{t.hook}</p>
            </header>

            <p className="mt-6 max-w-2xl text-sm">{t.story}</p>

            {t.persona && t.steps.length > 0 ? (
              <>
                <ol className="mt-8 space-y-2 text-sm">
                  {t.steps.map((s) => (
                    <li
                      key={s.label}
                      className="flex items-baseline gap-3 border-l-2 border-[var(--color-accent)] pl-3"
                    >
                      <span className="font-medium">{s.label}</span>
                      <span className="text-[var(--color-ink-muted)] text-xs">— {s.tip}</span>
                    </li>
                  ))}
                </ol>

                <form action={enterDemo} className="mt-8 flex items-center gap-3 flex-wrap">
                  <input type="hidden" name="userId" value={t.persona.id} />
                  <input type="hidden" name="redirectTo" value={t.steps[0].href} />
                  <button
                    type="submit"
                    className="rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-5 py-2.5 text-sm hover:opacity-90"
                  >
                    Start as {t.persona.name ?? "this persona"} →
                  </button>
                  <p className="text-xs text-[var(--color-ink-muted)]">
                    Drops you straight into step 1. Use the banner to switch personas anytime.
                  </p>
                </form>
              </>
            ) : (
              <p className="mt-6 text-xs text-[var(--color-ink-muted)]">
                Seed not yet loaded for this tour. Run <code>pnpm db:seed</code> first.
              </p>
            )}
          </article>
        ))}
      </main>
    </div>
  );
}

function currentQuarterParam(): string {
  const now = new Date();
  const q = Math.floor(now.getUTCMonth() / 3) + 1;
  return `${now.getUTCFullYear()}-Q${q}`;
}
