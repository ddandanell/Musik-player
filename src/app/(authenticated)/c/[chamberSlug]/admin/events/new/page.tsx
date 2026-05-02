import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";
import { createEvent } from "./actions";

export const dynamic = "force-dynamic";

export default async function NewEventPage({
  params,
}: {
  params: Promise<{ chamberSlug: string }>;
}) {
  const { chamberSlug } = await params;
  const session = await requireSession();
  const chamber = await prisma.chamber.findUnique({
    where: { slug: chamberSlug },
    select: { id: true, name: true, currency: true },
  });
  if (!chamber) notFound();
  if (!hasChamberRole(session, chamber.id, "CHAMBER_ADMIN")) {
    redirect(`/c/${chamberSlug}`);
  }

  return (
    <div className="max-w-2xl">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-ink-muted)]">
        {chamber.name}
      </p>
      <h1 className="font-[family-name:var(--font-display)] text-3xl mt-1">New event</h1>

      <form action={createEvent} className="mt-8 space-y-5">
        <input type="hidden" name="chamberSlug" value={chamberSlug} />

        <Field label="Title" name="title" required />
        <Field
          label="Slug (auto from title if blank)"
          name="slug"
          required={false}
          placeholder="quarterly-mixer"
        />

        <label className="block text-sm">
          <span className="text-[var(--color-ink-muted)]">Description</span>
          <textarea
            name="description"
            rows={5}
            required
            className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Starts at" name="startsAt" type="datetime-local" required />
          <Field label="Ends at" name="endsAt" type="datetime-local" required />
        </div>

        <Field label="Location" name="location" required={false} />

        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Capacity (blank = unlimited)"
            name="capacity"
            type="number"
            required={false}
          />
          <Field
            label={`Ticket price (${chamber.currency}, 0 = free)`}
            name="ticketPrice"
            type="number"
            required
            defaultValue="0"
          />
        </div>

        <label className="block text-sm">
          <span className="text-[var(--color-ink-muted)]">Visibility</span>
          <select
            name="visibility"
            required
            defaultValue="MEMBERS_ONLY"
            className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"
          >
            <option value="PUBLIC">Public — community layer</option>
            <option value="MEMBERS_ONLY">Members only</option>
            <option value="TIER_RESTRICTED">Tier restricted</option>
            <option value="BOARD_ONLY">Board only</option>
          </select>
        </label>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-6 py-3 text-sm"
          >
            Create event
          </button>
          <Link
            href={`/c/${chamberSlug}/admin/events`}
            className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
          >
            Cancel
          </Link>
        </div>
      </form>
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
