"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { chamberRoleFor } from "@/lib/auth/permissions";
import { recordAudit } from "@/lib/audit";

const addPostSchema = z.object({
  threadId: z.string().min(1),
  chamberSlug: z.string().min(1),
  body: z.string().min(2),
});

export async function addPost(formData: FormData): Promise<void> {
  const parsed = addPostSchema.parse({
    threadId: formData.get("threadId"),
    chamberSlug: formData.get("chamberSlug"),
    body: formData.get("body"),
  });

  const session = await requireSession();
  const thread = await prisma.forumThread.findUnique({
    where: { id: parsed.threadId },
    include: { chamber: { select: { id: true, slug: true } } },
  });
  if (!thread) throw new Error("Thread not found");
  if (thread.chamber.slug !== parsed.chamberSlug) throw new Error("Mismatched chamber");
  if (!chamberRoleFor(session, thread.chamberId)) {
    throw new Error("FORBIDDEN");
  }

  const post = await prisma.$transaction(async (tx) => {
    const created = await tx.forumPost.create({
      data: {
        threadId: thread.id,
        authorId: session.userId,
        body: parsed.body,
      },
    });
    await tx.forumThread.update({
      where: { id: thread.id },
      data: { updatedAt: new Date() },
    });
    return created;
  });

  await recordAudit({
    actorUserId: session.userId,
    chamberId: thread.chamberId,
    action: "forum.post_added",
    target: post.id,
    metadata: { threadId: thread.id },
  });

  revalidatePath(`/c/${parsed.chamberSlug}/forum`);
  revalidatePath(`/c/${parsed.chamberSlug}/forum/${thread.id}`);
}
