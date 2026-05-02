import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";
import { deleteArticle, updateArticle } from "./actions";

export const dynamic = "force-dynamic";

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ chamberSlug: string; id: string }>;
}) {
  const { chamberSlug, id } = await params;
  const session = await requireSession();
  const chamber = await prisma.chamber.findUnique({
    where: { slug: chamberSlug },
    select: { id: true, name: true },
  });
  if (!chamber) notFound();
  if (!hasChamberRole(session, chamber.id, "CHAMBER_ADMIN")) {
    redirect(`/c/${chamberSlug}`);
  }

  const article = await prisma.knowledgeArticle.findUnique({ where: { id } });
  if (!article || article.chamberId !== chamber.id) notFound();

  return (
    <div className="max-w-2xl">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-ink-muted)]">
        {chamber.name}
      </p>
      <h1 className="font-[family-name:var(--font-display)] text-3xl mt-1">Edit article</h1>
      <p className="text-xs text-[var(--color-ink-muted)] mt-1">
        /c/{chamberSlug}/knowledge/{article.slug}
      </p>

      <form action={updateArticle} className="mt-8 space-y-5">
        <input type="hidden" name="id" value={article.id} />
        <input type="hidden" name="chamberSlug" value={chamberSlug} />

        <label className="block text-sm">
          <span className="text-[var(--color-ink-muted)]">Title</span>
          <input
            name="title"
            defaultValue={article.title}
            required
            minLength={3}
            maxLength={200}
            className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          <span className="text-[var(--color-ink-muted)]">Body</span>
          <textarea
            name="body"
            rows={14}
            defaultValue={article.body}
            required
            minLength={10}
            className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          <span className="text-[var(--color-ink-muted)]">Tags (comma-separated)</span>
          <input
            name="tags"
            defaultValue={article.tags.join(", ")}
            className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isPublic" defaultChecked={article.isPublic} />
          <span>Show in public community layer</span>
        </label>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-6 py-3 text-sm"
          >
            Save changes
          </button>
          <Link
            href={`/c/${chamberSlug}/admin/knowledge`}
            className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
          >
            Cancel
          </Link>
        </div>
      </form>

      <form action={deleteArticle} className="mt-10 pt-6 border-t border-[var(--color-line)]">
        <input type="hidden" name="id" value={article.id} />
        <input type="hidden" name="chamberSlug" value={chamberSlug} />
        <button
          type="submit"
          className="rounded-[var(--radius-pill)] border border-[var(--color-line)] px-4 py-2 text-sm text-red-600 hover:border-red-600"
        >
          Delete article
        </button>
      </form>
    </div>
  );
}
