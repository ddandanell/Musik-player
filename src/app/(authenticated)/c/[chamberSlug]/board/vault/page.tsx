import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default async function BoardVaultPage({
  params,
}: {
  params: Promise<{ chamberSlug: string }>;
}) {
  const { chamberSlug } = await params;
  const session = await requireSession();
  const chamber = await prisma.chamber.findUnique({
    where: { slug: chamberSlug },
    select: { id: true, name: true },
  });
  if (!chamber) notFound();
  if (!hasChamberRole(session, chamber.id, "BOARD_MEMBER")) {
    redirect(`/c/${chamberSlug}`);
  }

  const canWrite = hasChamberRole(session, chamber.id, "CHAMBER_ADMIN");

  const documents = await prisma.document.findMany({
    where: { chamberId: chamber.id, visibility: "BOARD_ONLY" },
    orderBy: { uploadedAt: "desc" },
  });

  return (
    <div>
      <header className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-ink-muted)]">
            {chamber.name} board
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl mt-1">
            Document vault
          </h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-2">
            {documents.length} board-only document{documents.length === 1 ? "" : "s"}
          </p>
        </div>
        {canWrite && (
          <Link
            href={`/c/${chamberSlug}/board/vault/new`}
            className="rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-4 py-2 text-sm"
          >
            Add document
          </Link>
        )}
      </header>

      <ul className="mt-10 divide-y divide-[var(--color-line)]">
        {documents.length === 0 && (
          <li className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-line)] p-10 text-center text-sm text-[var(--color-ink-muted)]">
            No documents in the vault yet.
          </li>
        )}
        {documents.map((doc) => (
          <li key={doc.id} className="py-5 flex items-baseline justify-between gap-6 flex-wrap">
            <div className="min-w-0 flex-1">
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-[family-name:var(--font-display)] text-lg hover:underline"
              >
                {doc.title}
              </a>
              {doc.description && (
                <p className="text-sm text-[var(--color-ink-muted)] mt-1">
                  {doc.description}
                </p>
              )}
              <p className="text-xs text-[var(--color-ink-muted)] mt-2 uppercase tracking-[0.18em]">
                {doc.mimeType ?? "link"} · uploaded {formatDate(doc.uploadedAt)}
              </p>
            </div>
            <a
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--color-accent)] hover:underline"
            >
              Open ↗
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
