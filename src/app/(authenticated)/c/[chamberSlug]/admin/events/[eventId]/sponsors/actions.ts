"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";
import { recordAudit } from "@/lib/audit";

const addSchema = z.object({
  chamberSlug: z.string().min(1),
  eventId: z.string().min(1),
  sponsorId: z.string().min(1),
  tier: z.enum(["PLATINUM", "GOLD", "SILVER", "BRONZE"]),
});

const removeSchema = z.object({
  chamberSlug: z.string().min(1),
  eventId: z.string().min(1),
  eventSponsorId: z.string().min(1),
});

async function loadEvent(eventId: string, chamberSlug: string) {
  const chamber = await prisma.chamber.findUnique({
    where: { slug: chamberSlug },
    select: { id: true },
  });
  if (!chamber) throw new Error("Chamber not found");
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, chamberId: true, slug: true },
  });
  if (!event || event.chamberId !== chamber.id) {
    throw new Error("Event not found");
  }
  return { chamber, event };
}

export async function addEventSponsor(formData: FormData): Promise<void> {
  const parsed = addSchema.parse({
    chamberSlug: formData.get("chamberSlug"),
    eventId: formData.get("eventId"),
    sponsorId: formData.get("sponsorId"),
    tier: formData.get("tier"),
  });

  const session = await requireSession();
  const { chamber, event } = await loadEvent(parsed.eventId, parsed.chamberSlug);
  if (!hasChamberRole(session, chamber.id, "CHAMBER_ADMIN")) {
    throw new Error("FORBIDDEN");
  }

  const sponsor = await prisma.sponsor.findUnique({
    where: { id: parsed.sponsorId },
    select: { id: true, chamberId: true, name: true },
  });
  if (!sponsor || sponsor.chamberId !== chamber.id) {
    throw new Error("Sponsor not in this chamber");
  }

  await prisma.eventSponsor.upsert({
    where: { eventId_sponsorId: { eventId: event.id, sponsorId: sponsor.id } },
    update: { tier: parsed.tier },
    create: { eventId: event.id, sponsorId: sponsor.id, tier: parsed.tier },
  });

  await recordAudit({
    actorUserId: session.userId,
    chamberId: chamber.id,
    action: "event.sponsor_added",
    target: event.id,
    metadata: { sponsorId: sponsor.id, sponsorName: sponsor.name, tier: parsed.tier },
  });

  revalidatePath(`/c/${parsed.chamberSlug}/admin/events/${event.id}/sponsors`);
  revalidatePath(`/c/${parsed.chamberSlug}/events/${event.slug}`);
}

export async function removeEventSponsor(formData: FormData): Promise<void> {
  const parsed = removeSchema.parse({
    chamberSlug: formData.get("chamberSlug"),
    eventId: formData.get("eventId"),
    eventSponsorId: formData.get("eventSponsorId"),
  });

  const session = await requireSession();
  const { chamber, event } = await loadEvent(parsed.eventId, parsed.chamberSlug);
  if (!hasChamberRole(session, chamber.id, "CHAMBER_ADMIN")) {
    throw new Error("FORBIDDEN");
  }

  const link = await prisma.eventSponsor.findUnique({
    where: { id: parsed.eventSponsorId },
    select: { id: true, eventId: true, sponsorId: true },
  });
  if (!link || link.eventId !== event.id) {
    throw new Error("Sponsor link not found");
  }

  await prisma.eventSponsor.delete({ where: { id: link.id } });

  await recordAudit({
    actorUserId: session.userId,
    chamberId: chamber.id,
    action: "event.sponsor_removed",
    target: event.id,
    metadata: { sponsorId: link.sponsorId },
  });

  revalidatePath(`/c/${parsed.chamberSlug}/admin/events/${event.id}/sponsors`);
  revalidatePath(`/c/${parsed.chamberSlug}/events/${event.slug}`);
}
