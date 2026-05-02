import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { chamberRoleFor, hasChamberRole } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function KnowledgeArticlePage({
  params,
}: {
  params: Promise<{ chamberSlug: string; slug: string }>;
}) {
  const { chamberSlug, slug } = await params;

  const chamber = await prisma.chamber.findUnique({
    where: { slug: chamberSlug },
    select: { id: true, name: true },
  });
  if (!chamber) notFound();

  const article = await prisma.knowledgeArticle.findUnique({
    where: { chamberId_slug: { chamberId: chamber.id, slug } },
  });
  if (!article) notFound();

  const session = await getSession();
  const memberRole = chamberRoleFor(session, chamber.id);

  if (!article.isPublic && !memberRole) {
    if (!session) {
      const next = `/c/${chamberSlug}/knowledge/${slug}`;
      redirect(`/login?next=${encodeURIComponent(next)}`);
    }
    notFound();
  }

  const isAdmin = hasChamberRole(session, chamber.id, "CHAMBER_ADMIN");

  return (
    <article className="mx-auto max-w-3xl px-6 py-24">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-accent)]">
        {chamber.name}
      </p>
      <h1 className="font-[family-name:var(--font-display)] text-5xl tracking-tight mt-2">
        {article.title}
      </h1>
      <p className="text-sm text-[var(--color-ink-muted)] mt-3">
        updated {article.updatedAt.toISOString().slice(0, 10)}
        {article.isPublic && (
          <span className="ml-2 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)] px-2 py-0.5 uppercase tracking-[0.14em]">
            public
          </span>
        )}
      </p>
      {article.tags.length > 0 && (
        <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
          {article.tags.map((t) => `#${t}`).join("  ")}
        </p>
      )}

      <div className="mt-10 whitespace-pre-line leading-relaxed">{article.body}</div>

      <div className="mt-12 pt-6 border-t border-[var(--color-line)] text-sm flex flex-wrap gap-6">
        {memberRole ? (
          <Link
            href={`/c/${chamberSlug}/knowledge`}
            className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
          >
            ← Back to library
          </Link>
        ) : (
          <Link
            href={`/c/${chamberSlug}/apply`}
            className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
          >
            Join {chamber.name} for the full library →
          </Link>
        )}
        {isAdmin && (
          <Link
            href={`/c/${chamberSlug}/admin/knowledge/${article.id}`}
            className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
          >
            Edit article →
          </Link>
        )}
      </div>
    </article>
  );
}
