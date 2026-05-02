import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ChamberEventsPage({
  params,
}: {
  params: Promise<{ chamberSlug: string }>;
}) {
  const { chamberSlug } = await params;
  const chamber = await prisma.chamber.findUnique({
    where: { slug: chamberSlug },
    select: { id: true, name: true },
  });
  if (!chamber) notFound();

  const events = await prisma.event.findMany({
    where: { chamberId: chamber.id, status: { in: ["PUBLISHED", "COMPLETED"] } },
    orderBy: { startsAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Events</h1>
      <p className="text-[var(--color-ink-muted)] mt-2">{chamber.name}</p>
      <ul className="mt-8 divide-y divide-[var(--color-line)]">
        {events.length === 0 && (
          <li className="py-12 text-center text-sm text-[var(--color-ink-muted)]">
            No events scheduled.
          </li>
        )}
        {events.map((e) => (
          <li key={e.id} className="py-5">
            <p className="text-xs text-[var(--color-ink-muted)]">
              {e.startsAt.toISOString().slice(0, 10)} · {e.visibility}
            </p>
            <p className="font-[family-name:var(--font-display)] text-lg mt-1">{e.title}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
