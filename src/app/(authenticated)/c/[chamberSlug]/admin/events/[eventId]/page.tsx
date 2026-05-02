import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";
import { formatCurrency } from "@/lib/utils";
import {
  addTicketType,
  cancelEvent,
  publishEvent,
  updateEvent,
} from "./actions";

export const dynamic = "force-dynamic";

function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ chamberSlug: string; eventId: string }>;
}) {
  const { chamberSlug, eventId } = await params;
  const session = await requireSession();
  const chamber = await prisma.chamber.findUnique({
    where: { slug: chamberSlug },
    select: { id: true, currency: true },
  });
  if (!chamber) notFound();
  if (!hasChamberRole(session, chamber.id, "CHAMBER_ADMIN")) {
    redirect(`/c/${chamberSlug}`);
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      ticketTypes: { orderBy: { price: "asc" } },
      tickets: {
        include: { user: { select: { email: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!event || event.chamberId !== chamber.id) notFound();

  return (
    <div className="space-y-10">
      <header className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-ink-muted)]">
            {event.status} · {event.visibility.replaceAll("_", " ")}
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl mt-1">
            {event.title}
          </h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-1">
            /c/{chamberSlug}/events/{event.slug}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {event.status === "DRAFT" && (
            <form action={publishEvent}>
              <input type="hidden" name="eventId" value={event.id} />
              <input type="hidden" name="chamberSlug" value={chamberSlug} />
              <button
                type="submit"
                className="rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-4 py-2 text-sm"
              >
                Publish
              </button>
            </form>
          )}
          {event.status !== "CANCELLED" && (
            <form action={cancelEvent}>
              <input type="hidden" name="eventId" value={event.id} />
              <input type="hidden" name="chamberSlug" value={chamberSlug} />
              <button
                type="submit"
                className="rounded-[var(--radius-pill)] border border-[var(--color-line)] px-4 py-2 text-sm text-red-600 hover:border-red-600"
              >
                Cancel event
              </button>
            </form>
          )}
        </div>
      </header>

      <section>
        <h2 className="font-[family-name:var(--font-display)] text-xl">Details</h2>
        <form action={updateEvent} className="mt-4 space-y-4 max-w-2xl">
          <input type="hidden" name="eventId" value={event.id} />
          <input type="hidden" name="chamberSlug" value={chamberSlug} />

          <Field label="Title" name="title" defaultValue={event.title} />

          <label className="block text-sm">
            <span className="text-[var(--color-ink-muted)]">Description</span>
            <textarea
              name="description"
              rows={5}
              defaultValue={event.description}
              required
              className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Starts at"
              name="startsAt"
              type="datetime-local"
              defaultValue={toLocalInput(event.startsAt)}
            />
            <Field
              label="Ends at"
              name="endsAt"
              type="datetime-local"
              defaultValue={toLocalInput(event.endsAt)}
            />
          </div>

          <Field
            label="Location"
            name="location"
            required={false}
            defaultValue={event.location ?? ""}
          />

          <Field
            label="Capacity (blank = unlimited)"
            name="capacity"
            type="number"
            required={false}
            defaultValue={event.capacity?.toString() ?? ""}
          />

          <label className="block text-sm">
            <span className="text-[var(--color-ink-muted)]">Visibility</span>
            <select
              name="visibility"
              defaultValue={event.visibility}
              className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"
            >
              <option value="PUBLIC">Public</option>
              <option value="MEMBERS_ONLY">Members only</option>
              <option value="TIER_RESTRICTED">Tier restricted</option>
              <option value="BOARD_ONLY">Board only</option>
            </select>
          </label>

          <button
            type="submit"
            className="rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-5 py-2 text-sm"
          >
            Save changes
          </button>
        </form>
      </section>

      <section>
        <h2 className="font-[family-name:var(--font-display)] text-xl">Ticket types</h2>
        <ul className="mt-4 space-y-2">
          {event.ticketTypes.map((tt) => (
            <li
              key={tt.id}
              className="flex items-center justify-between rounded-[var(--radius-card)] border border-[var(--color-line)] px-4 py-3 text-sm"
            >
              <span>
                <span className="font-medium">{tt.name}</span>
                {tt.audience ? (
                  <span className="ml-2 text-xs text-[var(--color-ink-muted)] uppercase tracking-[0.18em]">
                    {tt.audience}
                  </span>
                ) : null}
              </span>
              <span className="text-[var(--color-ink-muted)]">
                {formatCurrency(tt.price.toString(), chamber.currency)}
                {tt.capacity ? ` · cap ${tt.capacity}` : ""}
              </span>
            </li>
          ))}
        </ul>

        <form action={addTicketType} className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3 max-w-3xl">
          <input type="hidden" name="eventId" value={event.id} />
          <input type="hidden" name="chamberSlug" value={chamberSlug} />
          <Field label="Name" name="name" />
          <Field label="Price" name="price" type="number" defaultValue="0" />
          <Field label="Capacity" name="capacity" type="number" required={false} />
          <Field label="Audience" name="audience" required={false} placeholder="MEMBER" />
          <button
            type="submit"
            className="col-span-2 lg:col-span-4 rounded-[var(--radius-pill)] border border-[var(--color-line)] px-4 py-2 text-sm hover:border-[var(--color-ink)]"
          >
            Add ticket type
          </button>
        </form>
      </section>

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-xl">Tickets</h2>
          <Link
            href={`/c/${chamberSlug}/events/${event.slug}`}
            className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
          >
            View public page
          </Link>
        </div>
        <ul className="mt-4 divide-y divide-[var(--color-line)] text-sm">
          {event.tickets.length === 0 && (
            <li className="py-6 text-center text-[var(--color-ink-muted)]">
              No tickets sold yet.
            </li>
          )}
          {event.tickets.map((t) => (
            <li key={t.id} className="py-3 flex justify-between">
              <span>{t.user.name ?? t.user.email}</span>
              <span className="text-[var(--color-ink-muted)]">{t.status}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = true,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="text-[var(--color-ink-muted)]">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"
      />
    </label>
  );
}
