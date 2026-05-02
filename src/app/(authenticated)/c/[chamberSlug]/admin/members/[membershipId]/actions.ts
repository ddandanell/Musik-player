"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";
import { recordAudit } from "@/lib/audit";

const updateSchema = z.object({
  membershipId: z.string().min(1),
  chamberSlug: z.string().min(1),
  role: z.enum(["CHAMBER_ADMIN", "BOARD_MEMBER", "CORPORATE_CONTACT", "BUSINESS_MEMBER"]),
  status: z.enum(["ACTIVE", "LAPSED", "CANCELLED"]),
  tierId: z.string().optional().nullable(),
  tags: z.string().optional(),
});

function parseTags(raw: string | undefined): string[] {
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0 && t.length <= 32),
    ),
  );
}

export async function updateMembership(formData: FormData): Promise<void> {
  const tierIdRaw = formData.get("tierId");
  const parsed = updateSchema.parse({
    membershipId: formData.get("membershipId"),
    chamberSlug: formData.get("chamberSlug"),
    role: formData.get("role"),
    status: formData.get("status"),
    tierId: tierIdRaw && tierIdRaw !== "" ? tierIdRaw : null,
    tags: formData.get("tags") ?? undefined,
  });

  const session = await requireSession();
  const membership = await prisma.membership.findUnique({
    where: { id: parsed.membershipId },
    select: {
      id: true,
      chamberId: true,
      role: true,
      status: true,
      tierId: true,
      tags: true,
    },
  });
  if (!membership) throw new Error("Membership not found");
  if (!hasChamberRole(session, membership.chamberId, "CHAMBER_ADMIN")) {
    throw new Error("FORBIDDEN");
  }

  const nextTags = parseTags(parsed.tags);

  await prisma.membership.update({
    where: { id: membership.id },
    data: {
      role: parsed.role,
      status: parsed.status,
      tierId: parsed.tierId ?? null,
      tags: nextTags,
    },
  });

  await recordAudit({
    actorUserId: session.userId,
    chamberId: membership.chamberId,
    action: "membership.updated",
    target: membership.id,
    metadata: {
      previous: {
        role: membership.role,
        status: membership.status,
        tierId: membership.tierId,
        tags: membership.tags,
      },
      next: {
        role: parsed.role,
        status: parsed.status,
        tierId: parsed.tierId ?? null,
        tags: nextTags,
      },
    },
  });

  revalidatePath(`/c/${parsed.chamberSlug}/admin/members`);
  revalidatePath(`/c/${parsed.chamberSlug}/admin/members/${membership.id}`);
}
