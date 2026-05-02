"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";
import { recordAudit } from "@/lib/audit";

const declareSchema = z.object({
  chamberSlug: z.string().min(1),
  subject: z.string().min(2).max(200),
  details: z.string().min(5).max(5000),
});

export async function declareConflict(formData: FormData): Promise<void> {
  const parsed = declareSchema.parse({
    chamberSlug: formData.get("chamberSlug"),
    subject: formData.get("subject"),
    details: formData.get("details"),
  });

  const session = await requireSession();
  const chamber = await prisma.chamber.findUnique({
    where: { slug: parsed.chamberSlug },
    select: { id: true },
  });
  if (!chamber) throw new Error("Chamber not found");
  if (!hasChamberRole(session, chamber.id, "BOARD_MEMBER")) {
    throw new Error("FORBIDDEN");
  }

  const declaration = await prisma.conflictDeclaration.create({
    data: {
      chamberId: chamber.id,
      declaredBy: session.userId,
      subject: parsed.subject,
      details: parsed.details,
    },
  });

  await recordAudit({
    actorUserId: session.userId,
    chamberId: chamber.id,
    action: "coi.declared",
    target: declaration.id,
    metadata: { subject: declaration.subject },
  });

  revalidatePath(`/c/${parsed.chamberSlug}/board/coi`);
  redirect(`/c/${parsed.chamberSlug}/board/coi`);
}
