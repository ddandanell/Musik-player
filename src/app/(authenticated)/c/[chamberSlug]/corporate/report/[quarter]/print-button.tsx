"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-[var(--radius-pill)] border border-[var(--color-line)] px-4 py-2 hover:border-[var(--color-ink)]"
    >
      Print / Save as PDF
    </button>
  );
}
