import type { Conversation } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function findOrCreateDirectConversation(
  chamberId: string,
  currentUserId: string,
  otherUserId: string,
): Promise<Conversation> {
  if (currentUserId === otherUserId) {
    throw new Error("Cannot start a conversation with yourself");
  }

  const existing = await prisma.conversation.findFirst({
    where: {
      chamberId,
      AND: [
        { participants: { some: { userId: currentUserId } } },
        { participants: { some: { userId: otherUserId } } },
      ],
      participants: { every: { userId: { in: [currentUserId, otherUserId] } } },
    },
    include: { participants: { select: { userId: true } } },
  });

  if (existing && existing.participants.length === 2) {
    const { participants: _participants, ...conversation } = existing;
    return conversation;
  }

  return prisma.conversation.create({
    data: {
      chamberId,
      startedById: currentUserId,
      lastMessageAt: new Date(),
      participants: {
        create: [
          { userId: currentUserId, lastReadAt: new Date() },
          { userId: otherUserId },
        ],
      },
    },
  });
}

export async function markConversationRead(
  conversationId: string,
  userId: string,
): Promise<void> {
  await prisma.conversationParticipant.updateMany({
    where: { conversationId, userId },
    data: { lastReadAt: new Date() },
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  const participants = await prisma.conversationParticipant.findMany({
    where: { userId },
    select: { conversationId: true, lastReadAt: true },
  });
  if (participants.length === 0) return 0;

  const checks = await Promise.all(
    participants.map((p) =>
      prisma.message.findFirst({
        where: {
          conversationId: p.conversationId,
          authorId: { not: userId },
          ...(p.lastReadAt ? { createdAt: { gt: p.lastReadAt } } : {}),
        },
        select: { id: true },
      }),
    ),
  );

  return checks.filter((m) => m !== null).length;
}
