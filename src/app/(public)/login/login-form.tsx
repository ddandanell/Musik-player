"use client";

import { useFormStatus } from "react-dom";
import { useActionState } from "react";
import { sendMagicLink, type AuthActionState } from "@/lib/auth/actions";

const initialState: AuthActionState = { status: "idle" };

export function LoginForm() {
  const [state, formAction] = useActionState(sendMagicLink, initialState);

  if (state.status === "sent") {
    return (
      <div
        role="status"
        className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-6"
      >
        <p className="font-[family-name:var(--font-display)] text-2xl">Check your inbox</p>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
          A magic link has been sent to <span className="font-medium">{state.email}</span>.
          Click it to finish signing in.
        </p>
      </div>
    );
  }

  return (
    <form className="mt-8 space-y-4" action={formAction} aria-label="Sign in">
      <label className="block text-sm">
        <span className="text-[var(--color-ink-muted)]">Email</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"
        />
      </label>

      {state.status === "error" && (
        <p className="text-sm text-red-600" role="alert">
          {state.message}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] py-3 disabled:opacity-50"
    >
      {pending ? "Sending…" : "Send magic link"}
    </button>
  );
}
