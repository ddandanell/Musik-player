import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";
import { updateMembership } from "./actions";

export const dynamic = "force-dynamic";

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ chamberSlug: string; membershipId: string }>;
}) {
  const { chamberSlug, membershipId } = await params;
  const session = await requireSession();
  const chamber = await prisma.chamber.findUnique({
    where: { slug: chamberSlug },
    select: {
      id: true,
      membershipTiers: {
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      },
    },
  });
  if (!chamber) notFound();
  if (!hasChamberRole(session, chamber.id, "CHAMBER_ADMIN")) {
    redirect(`/c/${chamberSlug}`);
  }

  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, chamberId: chamber.id },
    include: {
      user: { select: { name: true, email: true, phone: true, createdAt: true } },
      tier: { select: { id: true, name: true } },
      company: { select: { name: true } },
    },
  });
  if (!membership) notFound();

  const tagsValue = membership.tags.join(", ");

  return (
    <div className="max-w-2xl">
      <Link
        href={`/c/${chamberSlug}/admin/members`}
        className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
      >
        ← Back to members
      </Link>

      <h1 className="font-[family-name:var(--font-display)] text-3xl mt-4">
        {membership.user.name ?? membership.user.email}
      </h1>
      <p className="text-[var(--color-ink-muted)] mt-1 text-sm">
        {membership.user.email}
        {membership.company?.name ? ` · ${membership.company.name}` : ""}
      </p>

      <form
        action={updateMembership}
        className="mt-10 space-y-5 rounded-[var(--radius-card)] border border-[var(--color-line)] p-6"
      >
        <input type="hidden" name="membershipId" value={membership.id} />
        <input type="hidden" name="chamberSlug" value={chamberSlug} />

        <Select
          label="Role"
          name="role"
          defaultValue={membership.role}
          options={[
            { value: "BUSINESS_MEMBER", label: "Business member" },
            { value: "CORPORATE_CONTACT", label: "Corporate contact" },
            { value: "BOARD_MEMBER", label: "Board member" },
            { value: "CHAMBER_ADMIN", label: "Chamber admin" },
          ]}
        />

        <Select
          label="Status"
          name="status"
          defaultValue={membership.status === "PENDING_REVIEW" || membership.status === "PENDING_BOARD_VOTE" || membership.status === "REJECTED" ? "ACTIVE" : membership.status}
          options={[
            { value: "ACTIVE", label: "Active" },
            { value: "LAPSED", label: "Lapsed" },
            { value: "CANCELLED", label: "Cancelled" },
          ]}
        />

        <Select
          label="Tier"
          name="tierId"
          defaultValue={membership.tier?.id ?? ""}
          options={[
            { value: "", label: "No tier" },
            ...chamber.membershipTiers.map((t) => ({ value: t.id, label: t.name })),
          ]}
        />

        <label className="block text-sm">
          <span className="text-[var(--color-ink-muted)]">Tags</span>
          <input
            name="tags"
            defaultValue={tagsValue}
            placeholder="vip, mentor, speaker"
            className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"
          />
          <span className="text-xs text-[var(--color-ink-muted)] mt-1 block">
            Comma-separated. Lowercased and deduped on save.
          </span>
        </label>

        {membership.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {membership.tags.map((t) => (
              <span
                key={t}
                className="text-xs px-2 py-1 rounded-[var(--radius-pill)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <button
          type="submit"
          className="rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-surface)] px-5 py-2 text-sm"
        >
          Save changes
        </button>
      </form>
    </div>
  );
}

function Select({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block text-sm">
      <span className="text-[var(--color-ink-muted)]">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
