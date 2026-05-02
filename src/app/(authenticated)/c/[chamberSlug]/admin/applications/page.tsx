import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";
import { approveApplication, rejectApplication, sendToBoard } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminApplicationsPage({
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
  if (!hasChamberRole(session, chamber.id, "CHAMBER_ADMIN")) {
    redirect(`/c/${chamberSlug}`);
  }

  const applications = await prisma.membershipApplication.findMany({
    where: {
      chamberId: chamber.id,
      status: { in: ["PENDING_REVIEW", "PENDING_BOARD_VOTE"] },
    },
    include: { tier: { select: { name: true } } },
    orderBy: { submittedAt: "asc" },
  });

  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Applications</h1>
      <p className="text-[var(--color-ink-muted)] mt-2">
        {applications.length} awaiting decision.
      </p>

      <ul className="mt-8 space-y-4">
        {applications.length === 0 && (
          <li className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-line)] p-8 text-center text-sm text-[var(--color-ink-muted)]">
            No pending applications.
          </li>
        )}

        {applications.map((a) => {
          const motivation =
            (a.payload && typeof a.payload === "object" && "motivation" in a.payload
              ? (a.payload as { motivation?: string }).motivation
              : undefined) ?? "";
          return (
            <li
              key={a.id}
              className="rounded-[var(--radius-card)] border border-[var(--color-line)] p-6"
            >
              <div className="flex items-baseline justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-[family-name:var(--font-display)] text-xl">
                    {a.applicantName}
                  </p>
                  <p className="text-sm text-[var(--color-ink-muted)]">
                    {a.applicantEmail}
                    {a.companyName ? ` · ${a.companyName}` : ""}
                    {a.tier?.name ? ` · ${a.tier.name}` : ""}
                  </p>
                </div>
                <p className="text-xs text-[var(--color-ink-muted)]">
                  {a.status.replaceAll("_", " ")} · submitted{" "}
                  {a.submittedAt.toISOString().slice(0, 10)}
                </p>
              </div>

              {motivation && (
                <p className="mt-4 text-sm text-[var(--color-ink-muted)] whitespace-pre-line">
                  {motivation}
                </p>
              )}

              <div className="mt-6 flex gap-2 flex-wrap">
                <form action={approveApplication}>
                  <input type="hidden" name="applicationId" value={a.id} />
                  <input type="hidden" name="chamberSlug" value={chamberSlug} />
                  <button
                    type="submit"
                    className="rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-4 py-2 text-sm"
                  >
                    Approve
                  </button>
                </form>

                {a.status === "PENDING_REVIEW" && (
                  <form action={sendToBoard}>
                    <input type="hidden" name="applicationId" value={a.id} />
                    <input type="hidden" name="chamberSlug" value={chamberSlug} />
                    <button
                      type="submit"
                      className="rounded-[var(--radius-pill)] border border-[var(--color-line)] px-4 py-2 text-sm hover:border-[var(--color-ink)]"
                    >
                      Send to board
                    </button>
                  </form>
                )}

                <form action={rejectApplication}>
                  <input type="hidden" name="applicationId" value={a.id} />
                  <input type="hidden" name="chamberSlug" value={chamberSlug} />
                  <button
                    type="submit"
                    className="rounded-[var(--radius-pill)] border border-[var(--color-line)] px-4 py-2 text-sm text-red-600 hover:border-red-600"
                  >
                    Reject
                  </button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
