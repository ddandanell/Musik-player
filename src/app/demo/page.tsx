import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ShieldCheck, Briefcase, Vote, Building2, Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { isDemoMode } from "@/lib/auth/session";
import { enterDemo } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Try the demo · DanChamp",
  description: "Step into any persona and explore the platform.",
};

export default async function DemoPickerPage() {
  if (!isDemoMode()) notFound();

  const personas = await prisma.user.findMany({
    where: {
      OR: [
        { platformRole: "OPERATOR" },
        { memberships: { some: { status: "ACTIVE" } } },
      ],
    },
    include: {
      memberships: {
        where: { status: "ACTIVE" },
        include: { chamber: { select: { name: true, slug: true, brandColor: true } } },
      },
    },
    orderBy: { name: "asc" },
    take: 80,
  });

  const buckets: Record<string, typeof personas> = {
    operator: [],
    chamber_admin: [],
    board: [],
    corporate: [],
    member: [],
  };

  for (const p of personas) {
    if (p.platformRole === "OPERATOR") {
      buckets.operator.push(p);
      continue;
    }
    const role = p.memberships[0]?.role;
    if (role === "CHAMBER_ADMIN") buckets.chamber_admin.push(p);
    else if (role === "BOARD_MEMBER") buckets.board.push(p);
    else if (role === "CORPORATE_CONTACT") buckets.corporate.push(p);
    else if (role === "BUSINESS_MEMBER") buckets.member.push(p);
  }

  const sections = [
    {
      key: "operator" as const,
      Icon: ShieldCheck,
      title: "Operator",
      sub: "Owns the platform — provisions chambers, runs billing, monitors health.",
    },
    {
      key: "chamber_admin" as const,
      Icon: Building2,
      title: "Chamber admin",
      sub: "Runs one chamber day to day — members, events, communications.",
    },
    {
      key: "board" as const,
      Icon: Vote,
      title: "Board member",
      sub: "Votes on motions, signs minutes, governs the chamber.",
    },
    {
      key: "corporate" as const,
      Icon: Briefcase,
      title: "Corporate contact",
      sub: "Sees their company's roll-up + quarterly value report.",
    },
    {
      key: "member" as const,
      Icon: Users,
      title: "Business member",
      sub: "Browses directory, books events, posts in forum.",
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-[15px] font-semibold tracking-tight"
          >
            <span
              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[11px] text-white"
              style={{ background: "var(--color-accent)" }}
              aria-hidden="true"
            >
              D
            </span>
            DanChamp
          </Link>
          <Link href="/demo/walkthrough" className="btn btn-sm btn-secondary">
            Guided tour
            <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-16">
        <div className="max-w-2xl">
          <span className="pill pill-accent">Demo</span>
          <h1 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight leading-tight">
            Step into any persona.
          </h1>
          <p className="mt-3 text-[15px] text-[var(--color-fg-muted)] leading-relaxed">
            Pick anyone below to log in as them. You can switch personas anytime
            from the demo banner.
          </p>
        </div>

        <div className="mt-12 space-y-12">
          {sections.map((s) => {
            const items = buckets[s.key];
            if (items.length === 0) return null;
            return (
              <section key={s.key} aria-labelledby={`section-${s.key}`}>
                <header className="flex items-start gap-3 mb-4">
                  <span
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md mt-0.5"
                    style={{
                      background: "var(--color-accent-soft)",
                      color: "var(--color-accent)",
                    }}
                  >
                    <s.Icon size={16} strokeWidth={1.8} />
                  </span>
                  <div>
                    <h2
                      id={`section-${s.key}`}
                      className="text-base font-semibold"
                    >
                      {s.title}
                    </h2>
                    <p className="text-[13px] text-[var(--color-fg-muted)] mt-0.5">
                      {s.sub}
                    </p>
                  </div>
                </header>

                <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((p) => (
                    <li key={p.id}>
                      <PersonaCard
                        persona={p}
                        defaultRedirect={defaultRedirectFor(s.key, p)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}

type Persona = {
  id: string;
  name: string | null;
  email: string;
  headline: string | null;
  avatarUrl: string | null;
  bio: string | null;
  memberships: Array<{
    chamber: { name: string; slug: string; brandColor: string };
    role: string;
  }>;
};

function PersonaCard({
  persona,
  defaultRedirect,
}: {
  persona: Persona;
  defaultRedirect: string;
}) {
  const m = persona.memberships[0];
  return (
    <form action={enterDemo} className="card p-3.5 hover:border-[var(--color-border-strong)] transition-colors">
      <input type="hidden" name="userId" value={persona.id} />
      <input type="hidden" name="redirectTo" value={defaultRedirect} />

      <button type="submit" className="w-full text-left flex items-center gap-3">
        {persona.avatarUrl ? (
          <img
            src={persona.avatarUrl}
            alt=""
            width={40}
            height={40}
            className="rounded-full w-10 h-10 object-cover shrink-0"
          />
        ) : (
          <div
            className="rounded-full w-10 h-10 flex items-center justify-center text-[13px] text-white shrink-0"
            style={{ background: m?.chamber.brandColor ?? "var(--color-accent)" }}
          >
            {(persona.name ?? persona.email)[0]?.toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium truncate">
            {persona.name ?? persona.email}
          </p>
          {m && (
            <p className="text-[11px] text-[var(--color-fg-muted)] truncate">
              {m.chamber.name}
            </p>
          )}
        </div>
        <ArrowRight size={14} className="text-[var(--color-fg-subtle)] shrink-0" />
      </button>
    </form>
  );
}

function defaultRedirectFor(
  bucket: string,
  persona: { memberships: Array<{ chamber: { slug: string } }> },
): string {
  const slug = persona.memberships[0]?.chamber.slug;
  if (bucket === "operator") return "/operator";
  if (!slug) return "/me";
  if (bucket === "chamber_admin") return `/c/${slug}/admin`;
  if (bucket === "board") return `/c/${slug}/board`;
  if (bucket === "corporate") return `/c/${slug}/corporate`;
  return `/c/${slug}`;
}
