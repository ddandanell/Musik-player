"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { chamberRoleFor } from "@/lib/auth/permissions";
import { recordAudit } from "@/lib/audit";

const createSchema = z.object({
  chamberSlug: z.string().min(1),
  title: z.string().min(3).max(200),
  topic: z.string().max(60).optional(),
  body: z.string().min(2),
});

export async function createThread(formData: FormData): Promise<void> {
  const parsed = createSchema.parse({
    chamberSlug: formData.get("chamberSlug"),
    title: formData.get("title"),
    topic: formData.get("topic") || undefined,
    body: formData.get("body"),
  });

  const session = await requireSession();
  const chamber = await prisma.chamber.findUnique({
    where: { slug: parsed.chamberSlug },
    select: { id: true },
  });
  if (!chamber) throw new Error("Chamber not found");
  if (!chamberRoleFor(session, chamber.id)) {
    throw new Error("FORBIDDEN");
  }

  const thread = await prisma.$transaction(async (tx) => {
    const created = await tx.forumThread.create({
      data: {
        chamberId: chamber.id,
        title: parsed.title,
        topic: parsed.topic ?? null,
        createdById: session.userId,
      },
    });
    await tx.forumPost.create({
      data: {
        threadId: created.id,
        authorId: session.userId,
        body: parsed.body,
      },
    });
    return created;
  });

  await recordAudit({
    actorUserId: session.userId,
    chamberId: chamber.id,
    action: "forum.thread_created",
    target: thread.id,
    metadata: { title: thread.title, topic: thread.topic },
  });

  revalidatePath(`/c/${parsed.chamberSlug}/forum`);
  redirect(`/c/${parsed.chamberSlug}/forum/${thread.id}`);
}
