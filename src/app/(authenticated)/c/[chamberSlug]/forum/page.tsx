import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { chamberRoleFor } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function ForumPage({
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
  if (!chamberRoleFor(session, chamber.id)) {
    redirect(`/c/${chamberSlug}`);
  }

  const threads = await prisma.forumThread.findMany({
    where: { chamberId: chamber.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { posts: true } },
      posts: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { author: { select: { name: true, email: true } } },
      },
    },
    take: 100,
  });

  const authorIds = Array.from(new Set(threads.map((t) => t.createdById)));
  const authors = authorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: authorIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const authorMap = new Map(authors.map((a) => [a.id, a]));

  return (
    <div>
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">Business forum</h1>
          <p className="text-[var(--color-ink-muted)] mt-2 text-sm">
            {threads.length} thread{threads.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href={`/c/${chamberSlug}/forum/new`}
          className="rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-4 py-2 text-sm"
        >
          New thread
        </Link>
      </header>

      <ul className="mt-8 space-y-3">
        {threads.length === 0 && (
          <li className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-line)] p-10 text-center text-sm text-[var(--color-ink-muted)]">
            No threads yet. Start the first one.
          </li>
        )}
        {threads.map((t) => {
          const author = authorMap.get(t.createdById);
          const lastPost = t.posts[0];
          return (
            <li
              key={t.id}
              className="rounded-[var(--radius-card)] border border-[var(--color-line)] p-5"
            >
              <div className="flex items-baseline justify-between gap-4 flex-wrap">
                <div>
                  <Link
                    href={`/c/${chamberSlug}/forum/${t.id}`}
                    className="font-[family-name:var(--font-display)] text-xl hover:underline"
                  >
                    {t.title}
                  </Link>
                  <p className="text-xs text-[var(--color-ink-muted)] mt-1">
                    {t.topic && (
                      <span className="mr-2 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)] px-2 py-0.5 uppercase tracking-[0.14em]">
                        {t.topic}
                      </span>
                    )}
                    started by {author?.name ?? author?.email ?? "Unknown"}
                  </p>
                </div>
                <p className="text-xs text-[var(--color-ink-muted)] text-right">
                  {t._count.posts} post{t._count.posts === 1 ? "" : "s"}
                  <br />
                  last activity {t.updatedAt.toISOString().slice(0, 10)}
                  {lastPost && (
                    <>
                      <br />
                      by {lastPost.author.name ?? lastPost.author.email}
                    </>
                  )}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
