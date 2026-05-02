import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { chamberRoleFor, hasChamberRole } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default async function KnowledgePage({
  params,
  searchParams,
}: {
  params: Promise<{ chamberSlug: string }>;
  searchParams: Promise<{ tag?: string }>;
}) {
  const { chamberSlug } = await params;
  const sp = await searchParams;
  const session = await requireSession();

  const chamber = await prisma.chamber.findUnique({
    where: { slug: chamberSlug },
    select: { id: true },
  });
  if (!chamber) notFound();
  if (!chamberRoleFor(session, chamber.id)) {
    redirect(`/c/${chamberSlug}`);
  }

  const isAdmin = hasChamberRole(session, chamber.id, "CHAMBER_ADMIN");
  const tagFilter = sp.tag?.trim() || undefined;

  const articles = await prisma.knowledgeArticle.findMany({
    where: {
      chamberId: chamber.id,
      ...(tagFilter ? { tags: { has: tagFilter } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  const allTags = Array.from(new Set(articles.flatMap((a) => a.tags))).sort();
  const [featured, ...rest] = articles;

  return (
    <div>
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-accent)]">
            Editorial
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight mt-2">
            Knowledge library
          </h1>
          <p className="text-[var(--color-ink-muted)] mt-2 text-sm">
            {articles.length} article{articles.length === 1 ? "" : "s"}
            {tagFilter ? ` tagged "${tagFilter}"` : ""}
          </p>
        </div>
        {isAdmin && (
          <Link
            href={`/c/${chamberSlug}/admin/knowledge`}
            className="rounded-[var(--radius-pill)] border border-[var(--color-line)] px-4 py-2 text-sm hover:border-[var(--color-ink)]"
          >
            Manage knowledge
          </Link>
        )}
      </header>

      {allTags.length > 0 && (
        <nav className="mt-6 flex flex-wrap gap-2 text-xs">
          <Link
            href={`/c/${chamberSlug}/knowledge`}
            className={`rounded-[var(--radius-pill)] border px-3 py-1.5 ${
              !tagFilter
                ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-surface)]"
                : "border-[var(--color-line)] hover:border-[var(--color-ink)]"
            }`}
          >
            All
          </Link>
          {allTags.map((t) => (
            <Link
              key={t}
              href={`/c/${chamberSlug}/knowledge?tag=${encodeURIComponent(t)}`}
              className={`rounded-[var(--radius-pill)] border px-3 py-1.5 ${
                tagFilter === t
                  ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-surface)]"
                  : "border-[var(--color-line)] hover:border-[var(--color-ink)]"
              }`}
            >
              #{t}
            </Link>
          ))}
        </nav>
      )}

      {articles.length === 0 ? (
        <div className="mt-10 rounded-[var(--radius-card)] border border-dashed border-[var(--color-line)] p-12 text-center text-sm text-[var(--color-ink-muted)]">
          No articles yet.
        </div>
      ) : (
        <>
          {featured && (
            <Link
              href={`/c/${chamberSlug}/knowledge/${featured.slug}`}
              className="mt-10 group block overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] grid lg:grid-cols-[1.3fr_1fr] transition-shadow hover:shadow-[0_30px_70px_-35px_rgba(15,23,42,0.4)]"
            >
              <div
                className="relative aspect-[16/10] lg:aspect-auto bg-[var(--color-surface-2)]"
              >
                {featured.coverImageUrl && (
                  <Image
                    src={featured.coverImageUrl}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 60vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    priority
                  />
                )}
              </div>
              <div className="p-8 lg:p-12 flex flex-col gap-5 justify-center">
                <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.22em]">
                  <span className="text-[var(--color-accent)]">Featured</span>
                  <span className="text-[var(--color-ink-muted)]">·</span>
                  <span className="text-[var(--color-ink-muted)]">
                    {formatDate(featured.updatedAt)}
                  </span>
                  {featured.isPublic && (
                    <>
                      <span className="text-[var(--color-ink-muted)]">·</span>
                      <span className="rounded-[var(--radius-pill)] bg-[var(--color-accent-soft)] text-[var(--color-accent)] px-2 py-0.5">
                        Public
                      </span>
                    </>
                  )}
                </div>
                <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.75rem,1rem+1.5vw,2.5rem)] tracking-tight leading-tight group-hover:underline">
                  {featured.title}
                </h2>
                {featured.excerpt && (
                  <p className="text-[var(--color-ink-muted)] line-clamp-3">
                    {featured.excerpt}
                  </p>
                )}
                {featured.tags.length > 0 && (
                  <p className="text-xs text-[var(--color-ink-muted)]">
                    {featured.tags.map((t) => `#${t}`).join("  ")}
                  </p>
                )}
              </div>
            </Link>
          )}

          {rest.length > 0 && (
            <ul className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {rest.map((a) => (
                <li
                  key={a.id}
                  className="group overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] flex flex-col transition-shadow hover:shadow-[0_24px_60px_-30px_rgba(15,23,42,0.4)]"
                >
                  <Link
                    href={`/c/${chamberSlug}/knowledge/${a.slug}`}
                    className="flex flex-col h-full"
                  >
                    <div className="relative aspect-[16/10] bg-[var(--color-surface-2)]">
                      {a.coverImageUrl && (
                        <Image
                          src={a.coverImageUrl}
                          alt=""
                          fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      )}
                    </div>
                    <div className="p-5 flex-1 flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-muted)]">
                        {formatDate(a.updatedAt)}
                        {a.isPublic && (
                          <span className="rounded-[var(--radius-pill)] bg-[var(--color-accent-soft)] text-[var(--color-accent)] px-2 py-0.5">
                            Public
                          </span>
                        )}
                      </div>
                      <p className="font-[family-name:var(--font-display)] text-xl leading-tight">
                        {a.title}
                      </p>
                      {a.excerpt && (
                        <p className="text-sm text-[var(--color-ink-muted)] line-clamp-3">
                          {a.excerpt}
                        </p>
                      )}
                      {a.tags.length > 0 && (
                        <p className="text-[11px] text-[var(--color-ink-muted)] mt-auto pt-3">
                          {a.tags.map((t) => `#${t}`).join("  ")}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
