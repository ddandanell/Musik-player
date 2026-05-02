"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";
import { recordAudit } from "@/lib/audit";

const scheduleSchema = z.object({
  chamberSlug: z.string().min(1),
  title: z.string().min(2).max(200),
  scheduledAt: z.string().min(1),
  location: z.string().max(200).optional(),
  agenda: z.string().optional(),
});

export async function scheduleMeeting(formData: FormData): Promise<void> {
  const parsed = scheduleSchema.parse({
    chamberSlug: formData.get("chamberSlug"),
    title: formData.get("title"),
    scheduledAt: formData.get("scheduledAt"),
    location: formData.get("location") || undefined,
    agenda: formData.get("agenda") || undefined,
  });

  const session = await requireSession();
  const chamber = await prisma.chamber.findUnique({
    where: { slug: parsed.chamberSlug },
    select: { id: true },
  });
  if (!chamber) throw new Error("Chamber not found");
  if (!hasChamberRole(session, chamber.id, "CHAMBER_ADMIN")) {
    throw new Error("FORBIDDEN");
  }

  const scheduledAt = new Date(parsed.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw new Error("Invalid scheduledAt");
  }

  const agendaItems = (parsed.agenda ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((title, index) => ({ order: index + 1, title }));

  const boardMembers = await prisma.membership.findMany({
    where: { chamberId: chamber.id, status: "ACTIVE", role: "BOARD_MEMBER" },
    select: { userId: true },
  });

  const meeting = await prisma.meeting.create({
    data: {
      chamberId: chamber.id,
      title: parsed.title,
      scheduledAt,
      location: parsed.location ?? null,
      agenda: agendaItems as unknown as Prisma.InputJsonValue,
      status: "SCHEDULED",
      attendees: {
        create: boardMembers.map((m) => ({
          userId: m.userId,
          attendance: "INVITED" as const,
        })),
      },
    },
  });

  await recordAudit({
    actorUserId: session.userId,
    chamberId: chamber.id,
    action: "meeting.scheduled",
    target: meeting.id,
    metadata: {
      title: meeting.title,
      invited: boardMembers.length,
      agendaCount: agendaItems.length,
    },
  });

  revalidatePath(`/c/${parsed.chamberSlug}/board/meetings`);
  redirect(`/c/${parsed.chamberSlug}/board/meetings/${meeting.id}`);
}
