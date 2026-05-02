"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitApplication, type ApplyState } from "./actions";

const initial: ApplyState = { status: "idle" };

type Tier = { id: string; name: string };

export function ApplyForm({
  chamberSlug,
  tiers,
}: {
  chamberSlug: string;
  tiers: Tier[];
}) {
  const [state, formAction] = useActionState(submitApplication, initial);

  if (state.status === "submitted") {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-8">
        <p className="font-[family-name:var(--font-display)] text-3xl">Application received</p>
        <p className="mt-3 text-[var(--color-ink-muted)]">
          The chamber team will review your application. You&apos;ll get an email once a
          decision has been made.
        </p>
      </div>
    );
  }

  return (
    <form className="mt-8 space-y-5" action={formAction}>
      <input type="hidden" name="chamberSlug" value={chamberSlug} />

      <Field label="Full name" name="fullName" error={state.status === "error" ? state.fieldErrors?.fullName?.[0] : undefined} />
      <Field label="Email" name="email" type="email" error={state.status === "error" ? state.fieldErrors?.email?.[0] : undefined} />
      <Field label="Company (optional)" name="companyName" required={false} />

      {tiers.length > 0 && (
        <label className="block text-sm">
          <span className="text-[var(--color-ink-muted)]">Membership tier</span>
          <select
            name="tierId"
            className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"
          >
            <option value="">Let the chamber decide</option>
            {tiers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block text-sm">
        <span className="text-[var(--color-ink-muted)]">Why are you applying?</span>
        <textarea
          name="motivation"
          rows={4}
          required
          className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"
        />
        {state.status === "error" && state.fieldErrors?.motivation?.[0] && (
          <span className="text-xs text-red-600 mt-1 block">{state.fieldErrors.motivation[0]}</span>
        )}
      </label>

      {state.status === "error" && state.message && (
        <p className="text-sm text-red-600" role="alert">
          {state.message}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = true,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="text-[var(--color-ink-muted)]">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"
      />
      {error && <span className="text-xs text-red-600 mt-1 block">{error}</span>}
    </label>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-6 py-3 disabled:opacity-50"
    >
      {pending ? "Submitting…" : "Submit application"}
    </button>
  );
}
