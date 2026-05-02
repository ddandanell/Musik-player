import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { chamberRoleFor, hasChamberRole } from "@/lib/auth/permissions";
import { formatCurrency } from "@/lib/utils";
import { deleteListing, updateListing } from "./actions";

export const dynamic = "force-dynamic";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ chamberSlug: string; id: string }>;
}) {
  const { chamberSlug, id } = await params;
  const session = await requireSession();

  const chamber = await prisma.chamber.findUnique({
    where: { slug: chamberSlug },
    select: { id: true, currency: true },
  });
  if (!chamber) notFound();
  if (!chamberRoleFor(session, chamber.id)) {
    redirect(`/c/${chamberSlug}`);
  }

  const listing = await prisma.marketplaceListing.findUnique({ where: { id } });
  if (!listing || listing.chamberId !== chamber.id) notFound();

  const seller = await prisma.user.findUnique({
    where: { id: listing.sellerUserId },
    select: { name: true, email: true },
  });

  const isAdmin = hasChamberRole(session, chamber.id, "CHAMBER_ADMIN");
  const isOwner = listing.sellerUserId === session.userId;
  const canEdit = isAdmin || isOwner;

  return (
    <div className="max-w-3xl">
      <Link
        href={`/c/${chamberSlug}/marketplace`}
        className="text-xs uppercase tracking-[0.2em] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
      >
        ← Back to marketplace
      </Link>

      <header className="mt-3">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
          {listing.category}
          {listing.isFeatured && (
            <span className="ml-2 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)] px-2 py-0.5">
              Featured
            </span>
          )}
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl mt-2">
          {listing.title}
        </h1>
        <p className="text-sm text-[var(--color-ink-muted)] mt-2">
          listed by {seller?.name ?? seller?.email ?? "Unknown"} ·{" "}
          {listing.createdAt.toISOString().slice(0, 10)}
        </p>
      </header>

      <p className="mt-6 whitespace-pre-line">{listing.description}</p>

      <p className="mt-6 text-lg">
        {listing.priceFrom
          ? `From ${formatCurrency(listing.priceFrom.toString(), chamber.currency)}`
          : "Price on request"}
      </p>

      {canEdit && (
        <section className="mt-12 pt-8 border-t border-[var(--color-line)]">
          <h2 className="font-[family-name:var(--font-display)] text-xl">Edit listing</h2>
          <form action={updateListing} className="mt-4 space-y-4">
            <input type="hidden" name="id" value={listing.id} />
            <input type="hidden" name="chamberSlug" value={chamberSlug} />

            <label className="block text-sm">
              <span className="text-[var(--color-ink-muted)]">Title</span>
              <input
                name="title"
                defaultValue={listing.title}
                required
                minLength={3}
                maxLength={160}
                className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"
              />
            </label>

            <label className="block text-sm">
              <span className="text-[var(--color-ink-muted)]">Category</span>
              <input
                name="category"
                defaultValue={listing.category}
                required
                minLength={2}
                maxLength={60}
                className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"
              />
            </label>

            <label className="block text-sm">
              <span className="text-[var(--color-ink-muted)]">Description</span>
              <textarea
                name="description"
                rows={6}
                defaultValue={listing.description}
                required
                minLength={10}
                className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"
              />
            </label>

            <label className="block text-sm">
              <span className="text-[var(--color-ink-muted)]">
                Starting price ({chamber.currency}, blank = on request)
              </span>
              <input
                name="priceFrom"
                type="number"
                step="0.01"
                min={0}
                defaultValue={listing.priceFrom?.toString() ?? ""}
                className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"
              />
            </label>

            <button
              type="submit"
              className="rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-5 py-2 text-sm"
            >
              Save changes
            </button>
          </form>

          <form action={deleteListing} className="mt-8">
            <input type="hidden" name="id" value={listing.id} />
            <input type="hidden" name="chamberSlug" value={chamberSlug} />
            <button
              type="submit"
              className="rounded-[var(--radius-pill)] border border-[var(--color-line)] px-4 py-2 text-sm text-red-600 hover:border-red-600"
            >
              Delete listing
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
