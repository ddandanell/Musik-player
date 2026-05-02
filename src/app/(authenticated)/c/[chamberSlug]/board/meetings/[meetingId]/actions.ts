"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";
import { recordAudit } from "@/lib/audit";

const idSchema = z.object({
  meetingId: z.string().min(1),
  chamberSlug: z.string().min(1),
});

const rsvpSchema = idSchema.extend({
  attendance: z.enum(["ACCEPTED", "DECLINED"]),
});

const minutesSchema = idSchema.extend({
  minutes: z.string().max(50000),
});

async function loadMeeting(meetingId: string, chamberSlug: string) {
  const chamber = await prisma.chamber.findUnique({
    where: { slug: chamberSlug },
    select: { id: true },
  });
  if (!chamber) throw new Error("Chamber not found");
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    select: {
      id: true,
      chamberId: true,
      status: true,
      signedAt: true,
      title: true,
    },
  });
  if (!meeting) throw new Error("Meeting not found");
  if (meeting.chamberId !== chamber.id) throw new Error("Mismatched chamber");
  return { chamber, meeting };
}

export async function rsvpMeeting(formData: FormData): Promise<void> {
  const parsed = rsvpSchema.parse({
    meetingId: formData.get("meetingId"),
    chamberSlug: formData.get("chamberSlug"),
    attendance: formData.get("attendance"),
  });

  const session = await requireSession();
  const { chamber, meeting } = await loadMeeting(parsed.meetingId, parsed.chamberSlug);
  if (!hasChamberRole(session, chamber.id, "BOARD_MEMBER")) {
    throw new Error("FORBIDDEN");
  }

  const attendee = await prisma.meetingAttendee.findUnique({
    where: { meetingId_userId: { meetingId: meeting.id, userId: session.userId } },
  });
  if (!attendee) throw new Error("Not invited");

  await prisma.meetingAttendee.update({
    where: { meetingId_userId: { meetingId: meeting.id, userId: session.userId } },
    data: { attendance: parsed.attendance },
  });

  await recordAudit({
    actorUserId: session.userId,
    chamberId: chamber.id,
    action: "meeting.rsvp",
    target: meeting.id,
    metadata: { attendance: parsed.attendance },
  });

  revalidatePath(`/c/${parsed.chamberSlug}/board/meetings/${meeting.id}`);
}

export async function saveMinutes(formData: FormData): Promise<void> {
  const parsed = minutesSchema.parse({
    meetingId: formData.get("meetingId"),
    chamberSlug: formData.get("chamberSlug"),
    minutes: formData.get("minutes") ?? "",
  });

  const session = await requireSession();
  const { chamber, meeting } = await loadMeeting(parsed.meetingId, parsed.chamberSlug);
  if (!hasChamberRole(session, chamber.id, "CHAMBER_ADMIN")) {
    throw new Error("FORBIDDEN");
  }
  if (meeting.signedAt) {
    throw new Error("Minutes are signed and locked");
  }

  await prisma.meeting.update({
    where: { id: meeting.id },
    data: { minutes: parsed.minutes },
  });

  await recordAudit({
    actorUserId: session.userId,
    chamberId: chamber.id,
    action: "meeting.minutes_saved",
    target: meeting.id,
  });

  revalidatePath(`/c/${parsed.chamberSlug}/board/meetings/${meeting.id}`);
}

export async function signMinutes(formData: FormData): Promise<void> {
  const parsed = minutesSchema.parse({
    meetingId: formData.get("meetingId"),
    chamberSlug: formData.get("chamberSlug"),
    minutes: formData.get("minutes") ?? "",
  });

  const session = await requireSession();
  const { chamber, meeting } = await loadMeeting(parsed.meetingId, parsed.chamberSlug);
  if (!hasChamberRole(session, chamber.id, "CHAMBER_ADMIN")) {
    throw new Error("FORBIDDEN");
  }
  if (meeting.signedAt) return;

  await prisma.meeting.update({
    where: { id: meeting.id },
    data: {
      minutes: parsed.minutes,
      status: "COMPLETED",
      signedById: session.userId,
      signedAt: new Date(),
    },
  });

  await recordAudit({
    actorUserId: session.userId,
    chamberId: chamber.id,
    action: "meeting.signed",
    target: meeting.id,
    metadata: { title: meeting.title },
  });

  revalidatePath(`/c/${parsed.chamberSlug}/board/meetings/${meeting.id}`);
  revalidatePath(`/c/${parsed.chamberSlug}/board/meetings`);
}
