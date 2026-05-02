import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PublicEventsPage() {
  const events = await prisma.event
    .findMany({
      where: { visibility: "PUBLIC", status: "PUBLISHED", startsAt: { gte: new Date() } },
      include: { chamber: { select: { name: true, slug: true } } },
      orderBy: { startsAt: "asc" },
      take: 20,
    })
    .catch(() => []);

  return (
    <section className="mx-auto max-w-5xl px-6 py-24">
      <h1 className="font-[family-name:var(--font-display)] text-5xl tracking-tight">
        Public events
      </h1>
      <p className="mt-4 text-[var(--color-ink-muted)] max-w-2xl">
        Free and open events across all chambers on DanChamp.
      </p>

      {events.length === 0 ? (
        <p className="mt-12 text-sm text-[var(--color-ink-muted)]">
          No public events scheduled.
        </p>
      ) : (
        <ul className="mt-12 divide-y divide-[var(--color-line)]">
          {events.map((e) => (
            <li key={e.id} className="py-6">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
                {e.chamber.name} · {e.startsAt.toISOString().slice(0, 10)}
              </p>
              <p className="font-[family-name:var(--font-display)] text-2xl mt-1">{e.title}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
