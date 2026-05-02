"use client";

import { useState, useTransition } from "react";
import { sendBroadcast, type BroadcastResult } from "./actions";

type ComposerProps = {
  chamberSlug: string;
};

export function BroadcastComposer({ chamberSlug }: ComposerProps) {
  const [channel, setChannel] = useState<"EMAIL" | "WHATSAPP">("EMAIL");
  const [feedback, setFeedback] = useState<BroadcastResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setFeedback(null);
    startTransition(async () => {
      const result = await sendBroadcast(formData);
      setFeedback(result);
      if (result.ok) {
        const form = document.getElementById("broadcast-form") as HTMLFormElement | null;
        form?.reset();
        setChannel("EMAIL");
      }
    });
  }

  return (
    <form
      id="broadcast-form"
      action={handleSubmit}
      className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-6 space-y-4"
    >
      <input type="hidden" name="chamberSlug" value={chamberSlug} />

      <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-4 items-start">
        <label className="text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)] pt-2">
          Channel
        </label>
        <div className="flex gap-2">
          <ChannelButton
            active={channel === "EMAIL"}
            onClick={() => setChannel("EMAIL")}
            label="Email"
          />
          <ChannelButton
            active={channel === "WHATSAPP"}
            onClick={() => setChannel("WHATSAPP")}
            label="WhatsApp"
          />
          <input type="hidden" name="channel" value={channel} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-4 items-center">
        <label
          htmlFor="recipient"
          className="text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]"
        >
          Recipient
        </label>
        <input
          id="recipient"
          name="recipient"
          required
          placeholder={channel === "EMAIL" ? "person@example.com" : "+6281234567890"}
          className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm"
        />
      </div>

      {channel === "EMAIL" && (
        <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-4 items-center">
          <label
            htmlFor="subject"
            className="text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)]"
          >
            Subject
          </label>
          <input
            id="subject"
            name="subject"
            required={channel === "EMAIL"}
            className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm"
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-4 items-start">
        <label
          htmlFor="body"
          className="text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)] pt-2"
        >
          Message
        </label>
        <textarea
          id="body"
          name="body"
          required
          rows={6}
          className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm font-mono"
        />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-[var(--color-ink-muted)]">
          Test send. Logged to CommunicationLog regardless of provider response.
        </p>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-5 py-2 text-sm disabled:opacity-50"
        >
          {isPending ? "Sending…" : "Send"}
        </button>
      </div>

      {feedback && !feedback.ok && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {feedback.error}
        </p>
      )}
      {feedback && feedback.ok && (
        <p className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700">
          Sent and logged.
        </p>
      )}
    </form>
  );
}

function ChannelButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-[var(--radius-pill)] px-4 py-1.5 text-sm border transition-colors " +
        (active
          ? "bg-[var(--color-ink)] text-[var(--color-surface)] border-[var(--color-ink)]"
          : "border-[var(--color-line)] hover:border-[var(--color-ink)]")
      }
    >
      {label}
    </button>
  );
}
