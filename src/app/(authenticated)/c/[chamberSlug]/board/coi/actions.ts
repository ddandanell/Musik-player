"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";
import { recordAudit } from "@/lib/audit";

const resolveSchema = z.object({
  id: z.string().min(1),
  chamberSlug: z.string().min(1),
});

export async function markResolved(formData: FormData): Promise<void> {
  const parsed = resolveSchema.parse({
    id: formData.get("id"),
    chamberSlug: formData.get("chamberSlug"),
  });

  const session = await requireSession();
  const declaration = await prisma.conflictDeclaration.findUnique({
    where: { id: parsed.id },
    select: { id: true, chamberId: true, resolvedAt: true },
  });
  if (!declaration) throw new Error("Declaration not found");

  const chamber = await prisma.chamber.findUnique({
    where: { slug: parsed.chamberSlug },
    select: { id: true },
  });
  if (!chamber || chamber.id !== declaration.chamberId) {
    throw new Error("Mismatched chamber");
  }
  if (!hasChamberRole(session, chamber.id, "BOARD_MEMBER")) {
    throw new Error("FORBIDDEN");
  }
  if (declaration.resolvedAt) return;

  await prisma.conflictDeclaration.update({
    where: { id: declaration.id },
    data: { resolvedAt: new Date() },
  });

  await recordAudit({
    actorUserId: session.userId,
    chamberId: chamber.id,
    action: "coi.resolved",
    target: declaration.id,
  });

  revalidatePath(`/c/${parsed.chamberSlug}/board/coi`);
}
