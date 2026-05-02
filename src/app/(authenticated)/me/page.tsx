import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { isPlatformOperator } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

function initialsOf(label: string): string {
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function MeDashboard() {
  const session = await requireSession();
  const isOperator = isPlatformOperator(session);

  const [user, chamberDetails] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        name: true,
        email: true,
        avatarUrl: true,
        headline: true,
        location: true,
      },
    }),
    session.memberships.length > 0
      ? prisma.chamber.findMany({
          where: { id: { in: session.memberships.map((m) => m.chamberId) } },
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            country: true,
            tagline: true,
            brandColor: true,
            heroImageUrl: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const displayName = user?.name ?? user?.email ?? session.email;
  const chamberById = new Map(chamberDetails.map((c) => [c.id, c]));

  return (
    <section className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-center gap-4">
        <div className="relative h-12 w-12 shrink-0 rounded-full overflow-hidden bg-[var(--color-bg-muted)] flex items-center justify-center">
          {user?.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 object-cover"
            />
          ) : (
            <span className="text-[14px] font-medium text-[var(--color-fg-muted)]">
              {initialsOf(displayName)}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
            {displayName}
          </h1>
          {user?.headline && (
            <p className="text-[13px] text-[var(--color-fg-muted)] mt-0.5">
              {user.headline}
              {user.location ? ` · ${user.location}` : ""}
            </p>
          )}
        </div>
      </div>

      <div className="mt-8 sm:mt-10">
        <h2 className="text-xs uppercase tracking-wider text-[var(--color-fg-subtle)] mb-3">
          Your access
        </h2>
        <ul className="grid gap-3 md:grid-cols-2">
          {isOperator && (
            <li
              className="card p-5 md:col-span-2 flex items-start gap-4"
              style={{
                background: "var(--color-fg)",
                color: "var(--color-bg)",
                borderColor: "var(--color-fg)",
              }}
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/10">
                <ShieldCheck size={18} strokeWidth={1.8} />
              </span>
              <div className="flex-1">
                <p className="text-[11px] uppercase tracking-wider text-white/60">
                  Platform operator
                </p>
                <p className="font-semibold mt-0.5">Operator console</p>
                <p className="mt-1 text-[13px] text-white/70 leading-relaxed">
                  Provision chambers, monitor health, audit cross-tenant actions.
                </p>
                <Link
                  href="/operator"
                  className="btn btn-sm mt-4 inline-flex"
                  style={{ background: "white", color: "var(--color-fg)" }}
                >
                  Open console
                  <ArrowRight size={14} />
                </Link>
              </div>
            </li>
          )}

          {session.memberships.map((m) => {
            const chamber = chamberById.get(m.chamberId);
            return (
              <li
                key={m.chamberId}
                className="card overflow-hidden hover:shadow-[var(--shadow-md)] transition-shadow"
              >
                <Link href={`/c/${m.chamberSlug}`} className="block">
                  <div
                    className="relative h-20"
                    style={{ background: chamber?.brandColor }}
                  >
                    {chamber?.heroImageUrl && (
                      <Image
                        src={chamber.heroImageUrl}
                        alt=""
                        fill
                        sizes="(min-width: 768px) 50vw, 100vw"
                        className="object-cover opacity-60"
                      />
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-[11px] text-[var(--color-fg-subtle)]">
                      {chamber?.city ? `${chamber.city}, ${chamber.country}` : chamber?.country}
                    </p>
                    <p className="font-semibold mt-1 text-[15px] leading-snug">
                      {chamber?.name ?? m.chamberSlug}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="pill capitalize">
                        {m.role.replaceAll("_", " ").toLowerCase()}
                      </span>
                      <span className="text-[12px] text-[var(--color-fg-muted)] inline-flex items-center gap-1">
                        Open
                        <ArrowRight size={12} />
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}

          {session.memberships.length === 0 && !isOperator && (
            <li className="card p-8 text-center md:col-span-2">
              <p className="text-[13px] text-[var(--color-fg-muted)]">
                You&apos;re not a member of any chamber yet.
              </p>
              <Link href="/chambers" className="btn btn-sm btn-primary mt-3">
                Browse chambers
              </Link>
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}
