import Link from "next/link";
import { createChamber } from "./actions";

export default function NewChamberPage() {
  return (
    <div className="max-w-2xl">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-ink-muted)]">
        Operator
      </p>
      <h1 className="font-[family-name:var(--font-display)] text-3xl mt-1">
        Create a chamber
      </h1>
      <p className="text-sm text-[var(--color-ink-muted)] mt-2">
        Provisions a tenant with a default Standard membership tier.
      </p>

      <form action={createChamber} className="mt-8 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Slug (kebab-case)" name="slug" placeholder="dancham-bali" />
          <Field label="Name" name="name" placeholder="DanCham Bali" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Country" name="country" placeholder="Indonesia" />
          <Field label="Currency" name="currency" defaultValue="IDR" />
          <Field
            label="Brand color"
            name="brandColor"
            type="color"
            defaultValue="#0B5FFF"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field
            label="License fee"
            name="licenseFee"
            type="number"
            defaultValue="0"
          />
          <Field
            label="Transaction fee (bps, 500 = 5%)"
            name="txFeeBps"
            type="number"
            defaultValue="500"
          />
        </div>

        <Field
          label="Initial admin email (optional)"
          name="initialAdminEmail"
          type="email"
          required={false}
          placeholder="admin@example.com"
        />

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-6 py-3 text-sm"
          >
            Create chamber
          </button>
          <Link
            href="/operator/chambers"
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
