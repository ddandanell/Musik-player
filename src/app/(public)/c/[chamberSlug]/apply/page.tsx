import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ApplyForm } from "./apply-form";

export const dynamic = "force-dynamic";

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ chamberSlug: string }>;
}) {
  const { chamberSlug } = await params;
  const chamber = await prisma.chamber.findUnique({
    where: { slug: chamberSlug },
    select: {
      id: true,
      name: true,
      status: true,
      membershipTiers: {
        where: { isHidden: false },
        select: { id: true, name: true, price: true },
        orderBy: { price: "asc" },
      },
    },
  });
  if (!chamber || chamber.status !== "ACTIVE") notFound();

  return (
    <section className="mx-auto max-w-2xl px-6 py-24">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-accent)]">
        Apply to join
      </p>
      <h1 className="font-[family-name:var(--font-display)] text-5xl tracking-tight mt-2">
        {chamber.name}
      </h1>
      <p className="mt-4 text-[var(--color-ink-muted)]">
        Tell us about yourself. The chamber team reviews every application.
      </p>

      <ApplyForm
        chamberSlug={chamberSlug}
        tiers={chamber.membershipTiers.map((t) => ({ id: t.id, name: t.name }))}
      />
    </section>
  );
}
