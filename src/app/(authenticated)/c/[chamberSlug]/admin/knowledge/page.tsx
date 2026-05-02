import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AdminKnowledgePage({
  params,
}: {
  params: Promise<{ chamberSlug: string }>;
}) {
  const { chamberSlug } = await params;
  const session = await requireSession();
  const chamber = await prisma.chamber.findUnique({
    where: { slug: chamberSlug },
    select: { id: true },
  });
  if (!chamber) notFound();
  if (!hasChamberRole(session, chamber.id, "CHAMBER_ADMIN")) {
    redirect(`/c/${chamberSlug}`);
  }

  const articles = await prisma.knowledgeArticle.findMany({
    where: { chamberId: chamber.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">Manage knowledge</h1>
          <p className="text-[var(--color-ink-muted)] mt-2 text-sm">
            {articles.length} article{articles.length === 1 ? "" : "s"} on file.
          </p>
        </div>
        <Link
          href={`/c/${chamberSlug}/admin/knowledge/new`}
          className="rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-4 py-2 text-sm"
        >
          New article
        </Link>
      </header>

      <ul className="mt-8 space-y-3">
        {articles.length === 0 && (
          <li className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-line)] p-10 text-center text-sm text-[var(--color-ink-muted)]">
            No articles yet. Publish the first one.
          </li>
        )}
        {articles.map((a) => (
          <li
            key={a.id}
            className="rounded-[var(--radius-card)] border border-[var(--color-line)] p-5 flex items-baseline justify-between gap-4 flex-wrap"
          >
            <div>
              <Link
                href={`/c/${chamberSlug}/admin/knowledge/${a.id}`}
                className="font-[family-name:var(--font-display)] text-xl hover:underline"
              >
                {a.title}
              </Link>
              <p className="text-xs text-[var(--color-ink-muted)] mt-1">
                /c/{chamberSlug}/knowledge/{a.slug}
                {a.isPublic && (
                  <span className="ml-2 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)] px-2 py-0.5 uppercase tracking-[0.14em]">
                    public
                  </span>
                )}
              </p>
              {a.tags.length > 0 && (
                <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                  {a.tags.map((t) => `#${t}`).join("  ")}
                </p>
              )}
            </div>
            <Link
              href={`/c/${chamberSlug}/admin/knowledge/${a.id}`}
              className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            >
              Edit →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
