"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";
import { recordAudit } from "@/lib/audit";

const baseSchema = z.object({
  eventId: z.string().min(1),
  chamberSlug: z.string().min(1),
});

const updateSchema = baseSchema.extend({
  title: z.string().min(3).max(160),
  description: z.string().min(10),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  location: z.string().optional(),
  capacity: z.string().optional(),
  visibility: z.enum(["PUBLIC", "MEMBERS_ONLY", "TIER_RESTRICTED", "BOARD_ONLY"]),
});

async function loadEvent(eventId: string, chamberSlug: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { chamber: { select: { id: true, slug: true } } },
  });
  if (!event) throw new Error("Event not found");
  if (event.chamber.slug !== chamberSlug) throw new Error("Mismatched chamber");
  return event;
}

export async function updateEvent(formData: FormData): Promise<void> {
  const parsed = updateSchema.parse({
    eventId: formData.get("eventId"),
    chamberSlug: formData.get("chamberSlug"),
    title: formData.get("title"),
    description: formData.get("description"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    location: formData.get("location") || undefined,
    capacity: formData.get("capacity") || undefined,
    visibility: formData.get("visibility"),
  });

  const session = await requireSession();
  const event = await loadEvent(parsed.eventId, parsed.chamberSlug);
  if (!hasChamberRole(session, event.chamberId, "CHAMBER_ADMIN")) {
    throw new Error("FORBIDDEN");
  }

  const startsAt = new Date(parsed.startsAt);
  const endsAt = new Date(parsed.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    throw new Error("Invalid date");
  }
  if (endsAt < startsAt) throw new Error("endsAt must be after startsAt");

  await prisma.event.update({
    where: { id: event.id },
    data: {
      title: parsed.title,
      description: parsed.description,
      startsAt,
      endsAt,
      location: parsed.location ?? null,
      capacity: parsed.capacity ? Number(parsed.capacity) : null,
      visibility: parsed.visibility,
    },
  });

  await recordAudit({
    actorUserId: session.userId,
    chamberId: event.chamberId,
    action: "event.updated",
    target: event.id,
  });

  revalidatePath(`/c/${parsed.chamberSlug}/admin/events`);
  revalidatePath(`/c/${parsed.chamberSlug}/admin/events/${event.id}`);
}

const ticketTypeSchema = baseSchema.extend({
  name: z.string().min(1).max(80),
  price: z.string().min(1),
  capacity: z.string().optional(),
  audience: z.string().optional(),
});

export async function addTicketType(formData: FormData): Promise<void> {
  const parsed = ticketTypeSchema.parse({
    eventId: formData.get("eventId"),
    chamberSlug: formData.get("chamberSlug"),
    name: formData.get("name"),
    price: formData.get("price"),
    capacity: formData.get("capacity") || undefined,
    audience: formData.get("audience") || undefined,
  });

  const session = await requireSession();
  const event = await loadEvent(parsed.eventId, parsed.chamberSlug);
  if (!hasChamberRole(session, event.chamberId, "CHAMBER_ADMIN")) {
    throw new Error("FORBIDDEN");
  }

  const price = Number(parsed.price);
  if (Number.isNaN(price) || price < 0) throw new Error("Invalid price");

  const ticketType = await prisma.ticketType.create({
    data: {
      eventId: event.id,
      name: parsed.name,
      price,
      capacity: parsed.capacity ? Number(parsed.capacity) : null,
      audience: parsed.audience ?? null,
    },
  });

  await recordAudit({
    actorUserId: session.userId,
    chamberId: event.chamberId,
    action: "event.ticket_type.added",
    target: ticketType.id,
    metadata: { eventId: event.id, name: ticketType.name },
  });

  revalidatePath(`/c/${parsed.chamberSlug}/admin/events/${event.id}`);
}

export async function publishEvent(formData: FormData): Promise<void> {
  const parsed = baseSchema.parse({
    eventId: formData.get("eventId"),
    chamberSlug: formData.get("chamberSlug"),
  });

  const session = await requireSession();
  const event = await loadEvent(parsed.eventId, parsed.chamberSlug);
  if (!hasChamberRole(session, event.chamberId, "CHAMBER_ADMIN")) {
    throw new Error("FORBIDDEN");
  }
  if (event.status !== "DRAFT") return;

  await prisma.event.update({
    where: { id: event.id },
    data: { status: "PUBLISHED" },
  });

  await recordAudit({
    actorUserId: session.userId,
    chamberId: event.chamberId,
    action: "event.published",
    target: event.id,
  });

  revalidatePath(`/c/${parsed.chamberSlug}/admin/events`);
  revalidatePath(`/c/${parsed.chamberSlug}/admin/events/${event.id}`);
  revalidatePath(`/c/${parsed.chamberSlug}/events/${event.slug}`);
}

export async function cancelEvent(formData: FormData): Promise<void> {
  const parsed = baseSchema.parse({
    eventId: formData.get("eventId"),
    chamberSlug: formData.get("chamberSlug"),
  });

  const session = await requireSession();
  const event = await loadEvent(parsed.eventId, parsed.chamberSlug);
  if (!hasChamberRole(session, event.chamberId, "CHAMBER_ADMIN")) {
    throw new Error("FORBIDDEN");
  }
  if (event.status === "CANCELLED") return;

  await prisma.event.update({
    where: { id: event.id },
    data: { status: "CANCELLED" },
  });

  await recordAudit({
    actorUserId: session.userId,
    chamberId: event.chamberId,
    action: "event.cancelled",
    target: event.id,
  });

  revalidatePath(`/c/${parsed.chamberSlug}/admin/events`);
  revalidatePath(`/c/${parsed.chamberSlug}/admin/events/${event.id}`);
  revalidatePath(`/c/${parsed.chamberSlug}/events/${event.slug}`);
}
