import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

function initialOf(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || "?";
}

export default async function SponsorsAdminPage({
  params,
}: {
  params: Promise<{ chamberSlug: string }>;
}) {
  const { chamberSlug } = await params;
  const session = await requireSession();
  const chamber = await prisma.chamber.findUnique({
    where: { slug: chamberSlug },
    select: { id: true, name: true, brandColor: true },
  });
  if (!chamber) notFound();
  if (!hasChamberRole(session, chamber.id, "CHAMBER_ADMIN")) {
    redirect(`/c/${chamberSlug}`);
  }

  const sponsors = await prisma.sponsor.findMany({
    where: { chamberId: chamber.id },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <header className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">Sponsors</h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-2">
            {sponsors.length} sponsor{sponsors.length === 1 ? "" : "s"} for {chamber.name}
          </p>
        </div>
        <Link
          href={`/c/${chamberSlug}/admin/sponsors/new`}
          className="rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-4 py-2 text-sm"
        >
          New sponsor
        </Link>
      </header>

      {sponsors.length === 0 ? (
        <div className="mt-10 rounded-[var(--radius-card)] border border-dashed border-[var(--color-line)] p-10 text-center text-sm text-[var(--color-ink-muted)]">
          No sponsors yet. Add the first one.
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {sponsors.map((s) => (
            <li
              key={s.id}
              className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-5 flex gap-4"
            >
              <div className="shrink-0">
                {s.logoUrl ? (
                  <Image
                    src={s.logoUrl}
                    alt={`${s.name} logo`}
                    width={64}
                    height={64}
                    unoptimized
                    className="h-16 w-16 rounded-md object-contain bg-white"
                  />
                ) : (
                  <div
                    className="h-16 w-16 rounded-md flex items-center justify-center font-[family-name:var(--font-display)] text-2xl text-white"
                    style={{ backgroundColor: chamber.brandColor }}
                  >
                    {initialOf(s.name)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-[family-name:var(--font-display)] text-lg truncate">
                  {s.name}
                </h2>
                {s.websiteUrl && (
                  <a
                    href={s.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[var(--color-accent)] hover:underline truncate block"
                  >
                    {s.websiteUrl}
                  </a>
                )}
                {s.blurb && (
                  <p className="text-xs text-[var(--color-ink-muted)] mt-2 line-clamp-2">
                    {s.blurb}
                  </p>
                )}
                <div className="mt-3 flex gap-3 text-xs">
                  <Link
                    href={`/c/${chamberSlug}/admin/sponsors/${s.id}`}
                    className="text-[var(--color-ink)] hover:underline"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
