"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { chamberRoleFor } from "@/lib/auth/permissions";
import { recordAudit } from "@/lib/audit";
import {
  findOrCreateDirectConversation,
  markConversationRead,
} from "@/lib/messaging";
import { createNotification } from "@/lib/notifications";

const sendMessageSchema = z.object({
  conversationId: z.string().min(1),
  body: z.string().min(1).max(4000),
});

export async function sendMessage(formData: FormData): Promise<void> {
  const parsed = sendMessageSchema.parse({
    conversationId: formData.get("conversationId"),
    body: formData.get("body"),
  });

  const session = await requireSession();
  const conversation = await prisma.conversation.findUnique({
    where: { id: parsed.conversationId },
    include: {
      chamber: { select: { id: true, name: true } },
      participants: { select: { userId: true } },
    },
  });
  if (!conversation) throw new Error("Conversation not found");

  const isParticipant = conversation.participants.some(
    (p) => p.userId === session.userId,
  );
  if (!isParticipant) throw new Error("FORBIDDEN");

  const sender = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, email: true },
  });
  const senderLabel = sender?.name ?? sender?.email ?? "A member";
  const trimmed = parsed.body.trim();
  if (trimmed.length === 0) return;

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.message.create({
      data: {
        conversationId: conversation.id,
        authorId: session.userId,
        body: trimmed,
      },
    });
    await tx.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: created.createdAt },
    });
    await tx.conversationParticipant.updateMany({
      where: { conversationId: conversation.id, userId: session.userId },
      data: { lastReadAt: created.createdAt },
    });
    return created;
  });

  const otherIds = conversation.participants
    .map((p) => p.userId)
    .filter((id) => id !== session.userId);

  await Promise.all(
    otherIds.map((userId) =>
      createNotification({
        userId,
        chamberId: conversation.chamberId,
        kind: "MESSAGE_RECEIVED",
        title: `${senderLabel} · ${conversation.chamber.name}`,
        body: trimmed.slice(0, 80),
        href: `/messages/${conversation.id}`,
      }),
    ),
  );

  await recordAudit({
    actorUserId: session.userId,
    chamberId: conversation.chamberId,
    action: "message.sent",
    target: message.id,
    metadata: { conversationId: conversation.id },
  });

  revalidatePath(`/messages/${conversation.id}`);
  revalidatePath(`/messages`);
}

const markReadSchema = z.object({
  conversationId: z.string().min(1),
});

export async function markRead(formData: FormData): Promise<void> {
  const parsed = markReadSchema.parse({
    conversationId: formData.get("conversationId"),
  });
  const session = await requireSession();
  await markConversationRead(parsed.conversationId, session.userId);
  revalidatePath(`/messages`);
  revalidatePath(`/messages/${parsed.conversationId}`);
}

const startConversationSchema = z.object({
  chamberSlug: z.string().min(1),
  targetUserId: z.string().min(1),
});

export async function startConversation(formData: FormData): Promise<void> {
  const parsed = startConversationSchema.parse({
    chamberSlug: formData.get("chamberSlug"),
    targetUserId: formData.get("targetUserId"),
  });

  const session = await requireSession();
  const chamber = await prisma.chamber.findUnique({
    where: { slug: parsed.chamberSlug },
    select: { id: true },
  });
  if (!chamber) throw new Error("Chamber not found");
  if (!chamberRoleFor(session, chamber.id)) throw new Error("FORBIDDEN");

  const targetMembership = await prisma.membership.findUnique({
    where: {
      chamberId_userId: { chamberId: chamber.id, userId: parsed.targetUserId },
    },
    select: { status: true },
  });
  if (!targetMembership || targetMembership.status !== "ACTIVE") {
    throw new Error("FORBIDDEN");
  }

  const conversation = await findOrCreateDirectConversation(
    chamber.id,
    session.userId,
    parsed.targetUserId,
  );

  redirect(`/messages/${conversation.id}`);
}

export async function markAllNotificationsRead(): Promise<void> {
  const session = await requireSession();
  await prisma.notification.updateMany({
    where: { userId: session.userId, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/messages");
  revalidatePath("/me");
}
