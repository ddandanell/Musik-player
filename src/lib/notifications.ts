import type { Notification, NotificationKind } from "@prisma/client";
import { prisma } from "@/lib/db";

export type CreateNotificationInput = {
  userId: string;
  kind: NotificationKind;
  title: string;
  chamberId?: string | null;
  body?: string | null;
  href?: string | null;
};

export async function createNotification(
  input: CreateNotificationInput,
): Promise<Notification> {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      kind: input.kind,
      title: input.title,
      chamberId: input.chamberId ?? null,
      body: input.body ?? null,
      href: input.href ?? null,
    },
  });
}

export async function markNotificationRead(
  id: string,
  userId: string,
): Promise<void> {
  await prisma.notification.updateMany({
    where: { id, userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function recentNotifications(
  userId: string,
  limit = 8,
): Promise<Notification[]> {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
