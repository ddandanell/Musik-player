import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-accent)]">
          404
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl">
          Not found
        </h1>
        <p className="mt-4 text-[var(--color-ink-muted)]">
          That page doesn&apos;t exist — or your chamber may not have published it yet.
        </p>
        <div className="mt-8 flex justify-center gap-3 flex-wrap">
          <Link
            href="/"
            className="rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-5 py-2.5 text-sm"
          >
            Home
          </Link>
          <Link
            href="/chambers"
            className="rounded-[var(--radius-pill)] border border-[var(--color-line)] px-5 py-2.5 text-sm hover:border-[var(--color-ink)]"
          >
            Chambers
          </Link>
        </div>
      </div>
    </main>
  );
}
