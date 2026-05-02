"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";
import { recordAudit } from "@/lib/audit";
import { evaluateMotion } from "@/lib/quorum";

const voteSchema = z.object({
  motionId: z.string().min(1),
  chamberSlug: z.string().min(1),
  choice: z.enum(["YES", "NO", "ABSTAIN"]),
});

export async function castVote(formData: FormData): Promise<void> {
  const parsed = voteSchema.parse({
    motionId: formData.get("motionId"),
    chamberSlug: formData.get("chamberSlug"),
    choice: formData.get("choice"),
  });

  const session = await requireSession();
  const motion = await prisma.motion.findUnique({
    where: { id: parsed.motionId },
    select: { id: true, chamberId: true, status: true },
  });
  if (!motion) throw new Error("Motion not found");
  if (!hasChamberRole(session, motion.chamberId, "BOARD_MEMBER")) {
    throw new Error("FORBIDDEN");
  }
  if (motion.status !== "OPEN") return;

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.vote.findUnique({
      where: { motionId_userId: { motionId: motion.id, userId: session.userId } },
      select: { id: true },
    });
    if (existing) {
      return { duplicate: true, evaluation: null };
    }
    await tx.vote.create({
      data: {
        motionId: motion.id,
        userId: session.userId,
        choice: parsed.choice,
      },
    });
    const evaluation = await evaluateMotion(motion.id, tx);
    return { duplicate: false, evaluation };
  });

  if (result.duplicate) {
    revalidatePath(`/c/${parsed.chamberSlug}/board/motions/${motion.id}`);
    return;
  }

  await recordAudit({
    actorUserId: session.userId,
    chamberId: motion.chamberId,
    action: "motion.voted",
    target: motion.id,
    metadata: { choice: parsed.choice },
  });

  if (result.evaluation?.closed) {
    await recordAudit({
      actorUserId: session.userId,
      chamberId: motion.chamberId,
      action: "motion.auto_closed",
      target: motion.id,
      metadata: {
        outcome: result.evaluation.status,
        yes: result.evaluation.yes,
        no: result.evaluation.no,
        abstain: result.evaluation.abstain,
      },
    });
  }

  revalidatePath(`/c/${parsed.chamberSlug}/board/motions`);
  revalidatePath(`/c/${parsed.chamberSlug}/board/motions/${motion.id}`);
}

const withdrawSchema = z.object({
  motionId: z.string().min(1),
  chamberSlug: z.string().min(1),
});

export async function withdrawMotion(formData: FormData): Promise<void> {
  const parsed = withdrawSchema.parse({
    motionId: formData.get("motionId"),
    chamberSlug: formData.get("chamberSlug"),
  });

  const session = await requireSession();
  const motion = await prisma.motion.findUnique({
    where: { id: parsed.motionId },
    select: { id: true, chamberId: true, status: true, proposedBy: true },
  });
  if (!motion) throw new Error("Motion not found");
  if (motion.status !== "OPEN") return;

  const isProposer = motion.proposedBy === session.userId;
  const isAdmin = hasChamberRole(session, motion.chamberId, "CHAMBER_ADMIN");
  if (!isProposer && !isAdmin) throw new Error("FORBIDDEN");

  await prisma.motion.update({
    where: { id: motion.id },
    data: { status: "WITHDRAWN", closedAt: new Date() },
  });

  await recordAudit({
    actorUserId: session.userId,
    chamberId: motion.chamberId,
    action: "motion.withdrawn",
    target: motion.id,
  });

  revalidatePath(`/c/${parsed.chamberSlug}/board/motions`);
  revalidatePath(`/c/${parsed.chamberSlug}/board/motions/${motion.id}`);
}
