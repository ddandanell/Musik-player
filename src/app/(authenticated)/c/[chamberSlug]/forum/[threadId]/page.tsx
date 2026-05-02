import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { chamberRoleFor } from "@/lib/auth/permissions";
import { addPost } from "./actions";

export const dynamic = "force-dynamic";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ chamberSlug: string; threadId: string }>;
}) {
  const { chamberSlug, threadId } = await params;
  const session = await requireSession();

  const chamber = await prisma.chamber.findUnique({
    where: { slug: chamberSlug },
    select: { id: true },
  });
  if (!chamber) notFound();
  if (!chamberRoleFor(session, chamber.id)) {
    redirect(`/c/${chamberSlug}`);
  }

  const thread = await prisma.forumThread.findUnique({
    where: { id: threadId },
    include: {
      posts: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true, email: true } } },
      },
    },
  });
  if (!thread || thread.chamberId !== chamber.id) notFound();

  return (
    <div className="max-w-3xl">
      <Link
        href={`/c/${chamberSlug}/forum`}
        className="text-xs uppercase tracking-[0.2em] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
      >
        ← Back to forum
      </Link>

      <header className="mt-3">
        {thread.topic && (
          <span className="inline-block rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)] text-xs uppercase tracking-[0.14em] px-2 py-0.5">
            {thread.topic}
          </span>
        )}
        <h1 className="font-[family-name:var(--font-display)] text-3xl mt-2">
          {thread.title}
        </h1>
      </header>

      <ol className="mt-8 space-y-5">
        {thread.posts.map((p, idx) => (
          <li
            key={p.id}
            className="rounded-[var(--radius-card)] border border-[var(--color-line)] p-5"
          >
            <p className="text-xs text-[var(--color-ink-muted)]">
              {p.author.name ?? p.author.email} · {p.createdAt.toISOString().slice(0, 16).replace("T", " ")}
              {idx === 0 ? " · original post" : ""}
            </p>
            <p className="mt-3 whitespace-pre-line">{p.body}</p>
          </li>
        ))}
      </ol>

      <form action={addPost} className="mt-10 space-y-4">
        <input type="hidden" name="threadId" value={thread.id} />
        <input type="hidden" name="chamberSlug" value={chamberSlug} />
        <label className="block text-sm">
          <span className="text-[var(--color-ink-muted)]">Reply</span>
          <textarea
            name="body"
            rows={5}
            required
            minLength={2}
            className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-5 py-2 text-sm"
        >
          Post reply
        </button>
      </form>
    </div>
  );
}
