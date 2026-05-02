"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";
import { recordAudit } from "@/lib/audit";
import { defaultQuorum } from "@/lib/quorum";

const createSchema = z.object({
  chamberSlug: z.string().min(1),
  title: z.string().min(3).max(200),
  body: z.string().min(10),
  quorum: z.string().optional(),
});

export async function createMotion(formData: FormData): Promise<void> {
  const parsed = createSchema.parse({
    chamberSlug: formData.get("chamberSlug"),
    title: formData.get("title"),
    body: formData.get("body"),
    quorum: formData.get("quorum") || undefined,
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

  const boardSize = await prisma.membership.count({
    where: { chamberId: chamber.id, status: "ACTIVE", role: "BOARD_MEMBER" },
  });

  const quorumValue = parsed.quorum ? Number(parsed.quorum) : defaultQuorum(boardSize);
  if (Number.isNaN(quorumValue) || quorumValue < 1) {
    throw new Error("Invalid quorum");
  }

  const motion = await prisma.motion.create({
    data: {
      chamberId: chamber.id,
      title: parsed.title,
      body: parsed.body,
      proposedBy: session.userId,
      quorum: quorumValue,
      status: "OPEN",
    },
  });

  await recordAudit({
    actorUserId: session.userId,
    chamberId: chamber.id,
    action: "motion.created",
    target: motion.id,
    metadata: { title: motion.title, quorum: quorumValue, boardSize },
  });

  revalidatePath(`/c/${parsed.chamberSlug}/board/motions`);
  redirect(`/c/${parsed.chamberSlug}/board/motions/${motion.id}`);
}
