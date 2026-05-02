import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";
import { updateChamberSettings } from "./actions";

export const dynamic = "force-dynamic";

export default async function ChamberSettingsPage({
  params,
}: {
  params: Promise<{ chamberSlug: string }>;
}) {
  const { chamberSlug } = await params;
  const session = await requireSession();
  const chamber = await prisma.chamber.findUnique({
    where: { slug: chamberSlug },
  });
  if (!chamber) notFound();
  if (!hasChamberRole(session, chamber.id, "CHAMBER_ADMIN")) {
    redirect(`/c/${chamberSlug}`);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Chamber settings</h1>
      <p className="text-[var(--color-ink-muted)] mt-2 text-sm">
        Branding, currency, and platform fee defaults.
      </p>

      <form
        action={updateChamberSettings}
        className="mt-10 space-y-5 rounded-[var(--radius-card)] border border-[var(--color-line)] p-6"
      >
        <input type="hidden" name="chamberSlug" value={chamberSlug} />

        <Field label="Display name" name="name" defaultValue={chamber.name} required />
        <Field label="Country" name="country" defaultValue={chamber.country} required />

        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Currency (ISO)"
            name="currency"
            defaultValue={chamber.currency}
            required
            placeholder="IDR"
          />
          <label className="block text-sm">
            <span className="text-[var(--color-ink-muted)]">Brand color</span>
            <input
              type="color"
              name="brandColor"
              defaultValue={chamber.brandColor}
              className="mt-1 w-full h-10 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)]"
            />
          </label>
        </div>

        <Field
          label="Logo URL"
          name="logoUrl"
          defaultValue={chamber.logoUrl ?? ""}
          required={false}
          placeholder="https://…"
        />

        <label className="block text-sm">
          <span className="text-[var(--color-ink-muted)]">
            Platform transaction fee (basis points)
          </span>
          <input
            type="number"
            name="txFeeBps"
            min={0}
            max={10000}
            defaultValue={chamber.txFeeBps}
            className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"
          />
          <span className="text-xs text-[var(--color-ink-muted)] mt-1 block">
            500 = 5%. Applied to ticket revenue. Visible to operator only.
          </span>
        </label>

        <button
          type="submit"
          className="rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-5 py-2 text-sm"
        >
          Save settings
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required = true,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="text-[var(--color-ink-muted)]">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"
      />
    </label>
  );
}
