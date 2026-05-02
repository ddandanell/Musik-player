import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";
import { deleteSponsor, updateSponsor } from "./actions";

export const dynamic = "force-dynamic";

export default async function EditSponsorPage({
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

  const sponsor = await prisma.sponsor.findUnique({ where: { id } });
  if (!sponsor || sponsor.chamberId !== chamber.id) notFound();

  return (
    <div className="max-w-2xl">
      <Link
        href={`/c/${chamberSlug}/admin/sponsors`}
        className="text-xs uppercase tracking-[0.2em] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
      >
        ← Sponsors
      </Link>
      <h1 className="font-[family-name:var(--font-display)] text-3xl mt-3">
        Edit sponsor
      </h1>
      <p className="text-sm text-[var(--color-ink-muted)] mt-2">{chamber.name}</p>

      <form action={updateSponsor} className="mt-8 space-y-5">
        <input type="hidden" name="id" value={sponsor.id} />
        <input type="hidden" name="chamberSlug" value={chamberSlug} />

        <label className="block text-sm">
          <span className="text-[var(--color-ink-muted)]">Name</span>
          <input
            name="name"
            type="text"
            required
            defaultValue={sponsor.name}
            className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          <span className="text-[var(--color-ink-muted)]">Logo URL</span>
          <input
            name="logoUrl"
            type="url"
            defaultValue={sponsor.logoUrl ?? ""}
            placeholder="https://..."
            className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          <span className="text-[var(--color-ink-muted)]">Website URL</span>
          <input
            name="websiteUrl"
            type="url"
            defaultValue={sponsor.websiteUrl ?? ""}
            placeholder="https://..."
            className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          <span className="text-[var(--color-ink-muted)]">Blurb</span>
          <textarea
            name="blurb"
            rows={4}
            defaultValue={sponsor.blurb ?? ""}
            className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"
          />
        </label>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-6 py-3 text-sm"
          >
            Save changes
          </button>
          <Link
            href={`/c/${chamberSlug}/admin/sponsors`}
            className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
          >
            Cancel
          </Link>
        </div>
      </form>

      <form action={deleteSponsor} className="mt-12 border-t border-[var(--color-line)] pt-6">
        <input type="hidden" name="id" value={sponsor.id} />
        <input type="hidden" name="chamberSlug" value={chamberSlug} />
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-ink-muted)]">
          Danger zone
        </p>
        <p className="text-sm text-[var(--color-ink-muted)] mt-2">
          Deleting removes this sponsor from any associated events.
        </p>
        <button
          type="submit"
          className="mt-3 rounded-[var(--radius-pill)] border border-[var(--color-line)] px-4 py-2 text-sm text-red-600 hover:border-red-600"
        >
          Delete sponsor
        </button>
      </form>
    </div>
  );
}
