import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { Star } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { chamberRoleFor } from "@/lib/auth/permissions";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MarketplacePage({
  params,
  searchParams,
}: {
  params: Promise<{ chamberSlug: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { chamberSlug } = await params;
  const sp = await searchParams;
  const session = await requireSession();

  const chamber = await prisma.chamber.findUnique({
    where: { slug: chamberSlug },
    select: { id: true, currency: true },
  });
  if (!chamber) notFound();
  if (!chamberRoleFor(session, chamber.id)) {
    redirect(`/c/${chamberSlug}`);
  }

  const categoryFilter = sp.category?.trim() || undefined;

  const listings = await prisma.marketplaceListing.findMany({
    where: {
      chamberId: chamber.id,
      ...(categoryFilter ? { category: categoryFilter } : {}),
    },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  const allCategories = Array.from(
    new Set(
      (
        await prisma.marketplaceListing.findMany({
          where: { chamberId: chamber.id },
          select: { category: true },
        })
      ).map((l) => l.category),
    ),
  ).sort();

  return (
    <div>
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-accent)]">
            Member-to-member
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight mt-2">
            Marketplace
          </h1>
          <p className="text-[var(--color-ink-muted)] mt-2 text-sm">
            {listings.length} listing{listings.length === 1 ? "" : "s"}
            {categoryFilter ? ` in "${categoryFilter}"` : ""}
          </p>
        </div>
        <Link
          href={`/c/${chamberSlug}/marketplace/new`}
          className="rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-5 py-2.5 text-sm hover:opacity-90"
        >
          New listing
        </Link>
      </header>

      {allCategories.length > 0 && (
        <nav className="mt-7 flex flex-wrap gap-2 text-xs">
          <Link
            href={`/c/${chamberSlug}/marketplace`}
            className={`rounded-[var(--radius-pill)] border px-3.5 py-1.5 ${
              !categoryFilter
                ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-surface)]"
                : "border-[var(--color-line)] bg-[var(--color-surface-2)] hover:border-[var(--color-ink)]"
            }`}
          >
            All categories
          </Link>
          {allCategories.map((c) => (
            <Link
              key={c}
              href={`/c/${chamberSlug}/marketplace?category=${encodeURIComponent(c)}`}
              className={`rounded-[var(--radius-pill)] border px-3.5 py-1.5 ${
                categoryFilter === c
                  ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-surface)]"
                  : "border-[var(--color-line)] bg-[var(--color-surface-2)] hover:border-[var(--color-ink)]"
              }`}
            >
              {c}
            </Link>
          ))}
        </nav>
      )}

      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {listings.length === 0 && (
          <li className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-line)] p-12 text-center text-sm text-[var(--color-ink-muted)] sm:col-span-2 lg:col-span-3">
            No listings yet.
          </li>
        )}
        {listings.map((l) => (
          <li
            key={l.id}
            className="group relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] flex flex-col transition-shadow hover:shadow-[0_24px_60px_-30px_rgba(15,23,42,0.4)]"
          >
            {l.isFeatured && (
              <span className="absolute top-3 left-3 z-10 inline-flex items-center gap-1 rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em]">
                <Star size={11} strokeWidth={1.8} />
                Featured
              </span>
            )}
            <Link
              href={`/c/${chamberSlug}/marketplace/${l.id}`}
              className="flex flex-col h-full"
            >
              <div className="relative aspect-[4/3] bg-[var(--color-surface-2)]">
                {l.imageUrl && (
                  <Image
                    src={l.imageUrl}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
              </div>
              <div className="p-5 flex-1 flex flex-col gap-3">
                <span className="self-start rounded-[var(--radius-pill)] bg-[var(--color-accent-soft)] text-[var(--color-accent)] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em]">
                  {l.category}
                </span>
                <p className="font-[family-name:var(--font-display)] text-xl leading-tight">
                  {l.title}
                </p>
                <p className="text-sm text-[var(--color-ink-muted)] line-clamp-3">
                  {l.description}
                </p>
                <p className="text-sm font-medium mt-auto pt-2 border-t border-[var(--color-line)]">
                  {l.priceFrom
                    ? `From ${formatCurrency(l.priceFrom.toString(), chamber.currency)}`
                    : "Price on request"}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
