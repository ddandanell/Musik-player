import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function BoardWorkspace({
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

  const [openMotions, pendingApplications] = await Promise.all([
    prisma.motion.count({ where: { chamberId: chamber.id, status: "OPEN" } }),
    prisma.membershipApplication.count({
      where: { chamberId: chamber.id, status: "PENDING_BOARD_VOTE" },
    }),
  ]);

  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Board workspace</h1>
      <p className="text-[var(--color-ink-muted)] mt-2">{chamber.name} governance.</p>

      <dl className="mt-8 grid grid-cols-2 gap-4">
        <Stat label="Open motions" value={openMotions} />
        <Stat label="Pending board votes" value={pendingApplications} />
      </dl>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-5">
      <dt className="text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
        {label}
      </dt>
      <dd className="font-[family-name:var(--font-display)] text-3xl mt-1">{value}</dd>
    </div>
  );
}
