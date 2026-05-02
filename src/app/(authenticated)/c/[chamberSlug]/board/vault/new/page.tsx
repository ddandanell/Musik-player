import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";
import { addDocument } from "./actions";

export const dynamic = "force-dynamic";

export default async function NewDocumentPage({
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
  if (!hasChamberRole(session, chamber.id, "CHAMBER_ADMIN")) {
    redirect(`/c/${chamberSlug}/board/vault`);
  }

  return (
    <div className="max-w-2xl">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-ink-muted)]">
        {chamber.name} board
      </p>
      <h1 className="font-[family-name:var(--font-display)] text-3xl mt-1">
        Add a board document
      </h1>
      <p className="text-sm text-[var(--color-ink-muted)] mt-2">
        Link to a document hosted in S3, Google Drive, Dropbox, or any URL.
      </p>

      <form action={addDocument} className="mt-8 space-y-5">
        <input type="hidden" name="chamberSlug" value={chamberSlug} />

        <label className="block text-sm">
          <span className="text-[var(--color-ink-muted)]">Title</span>
          <input
            name="title"
            type="text"
            required
            className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          <span className="text-[var(--color-ink-muted)]">Description</span>
          <textarea
            name="description"
            rows={3}
            className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          <span className="text-[var(--color-ink-muted)]">URL</span>
          <input
            name="url"
            type="url"
            required
            placeholder="https://..."
            className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          <span className="text-[var(--color-ink-muted)]">
            MIME type (e.g. application/pdf)
          </span>
          <input
            name="mimeType"
            type="text"
            placeholder="application/pdf"
            className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          <span className="text-[var(--color-ink-muted)]">Visibility</span>
          <select
            name="visibility"
            defaultValue="BOARD_ONLY"
            className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"
          >
            <option value="BOARD_ONLY">Board only</option>
            <option value="CHAMBER_ADMIN_ONLY">Chamber admin only</option>
            <option value="ALL_MEMBERS">All members</option>
          </select>
        </label>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-6 py-3 text-sm"
          >
            Save document
          </button>
          <Link
            href={`/c/${chamberSlug}/board/vault`}
            className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
