"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";
import { recordAudit } from "@/lib/audit";

const ticketActionSchema = z.object({
  ticketId: z.string().min(1),
  chamberSlug: z.string().min(1),
  eventId: z.string().min(1),
});

async function loadTicket(ticketId: string) {
  return prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      event: { select: { id: true, chamberId: true, capacity: true } },
      invoice: { select: { id: true, status: true } },
    },
  });
}

export async function checkInTicket(formData: FormData): Promise<void> {
  const { ticketId, chamberSlug, eventId } = ticketActionSchema.parse({
    ticketId: formData.get("ticketId"),
    chamberSlug: formData.get("chamberSlug"),
    eventId: formData.get("eventId"),
  });

  const session = await requireSession();
  const ticket = await loadTicket(ticketId);
  if (!ticket || ticket.event.id !== eventId) throw new Error("Ticket not found");
  if (!hasChamberRole(session, ticket.event.chamberId, "CHAMBER_ADMIN")) {
    throw new Error("FORBIDDEN");
  }
  if (ticket.status === "CHECKED_IN" || ticket.status === "REFUNDED") return;

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { status: "CHECKED_IN", checkedInAt: new Date() },
  });

  await recordAudit({
    actorUserId: session.userId,
    chamberId: ticket.event.chamberId,
    action: "ticket.checked_in",
    target: ticket.id,
    metadata: { eventId, previousStatus: ticket.status },
  });

  revalidatePath(`/c/${chamberSlug}/admin/events/${eventId}/attendance`);
}

export async function undoCheckIn(formData: FormData): Promise<void> {
  const { ticketId, chamberSlug, eventId } = ticketActionSchema.parse({
    ticketId: formData.get("ticketId"),
    chamberSlug: formData.get("chamberSlug"),
    eventId: formData.get("eventId"),
  });

  const session = await requireSession();
  const ticket = await loadTicket(ticketId);
  if (!ticket || ticket.event.id !== eventId) throw new Error("Ticket not found");
  if (!hasChamberRole(session, ticket.event.chamberId, "CHAMBER_ADMIN")) {
    throw new Error("FORBIDDEN");
  }
  if (ticket.status !== "CHECKED_IN") return;

  const reverted = ticket.invoice?.status === "PAID" ? "PAID" : "RESERVED";
  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { status: reverted, checkedInAt: null },
  });

  await recordAudit({
    actorUserId: session.userId,
    chamberId: ticket.event.chamberId,
    action: "ticket.check_in_reverted",
    target: ticket.id,
    metadata: { eventId, restoredTo: reverted },
  });

  revalidatePath(`/c/${chamberSlug}/admin/events/${eventId}/attendance`);
}

export async function promoteFromWaitlist(formData: FormData): Promise<void> {
  const { ticketId, chamberSlug, eventId } = ticketActionSchema.parse({
    ticketId: formData.get("ticketId"),
    chamberSlug: formData.get("chamberSlug"),
    eventId: formData.get("eventId"),
  });

  const session = await requireSession();
  const ticket = await loadTicket(ticketId);
  if (!ticket || ticket.event.id !== eventId) throw new Error("Ticket not found");
  if (!hasChamberRole(session, ticket.event.chamberId, "CHAMBER_ADMIN")) {
    throw new Error("FORBIDDEN");
  }
  if (ticket.status !== "WAITLISTED") return;

  const promoted = ticket.invoice?.status === "PAID" ? "PAID" : "RESERVED";

  await prisma.$transaction(async (tx) => {
    if (ticket.event.capacity !== null) {
      const seated = await tx.ticket.count({
        where: {
          eventId: ticket.event.id,
          status: { in: ["RESERVED", "PAID", "CHECKED_IN"] },
        },
      });
      if (seated >= ticket.event.capacity) {
        throw new Error("CAPACITY_FULL");
      }
    }
    await tx.ticket.update({
      where: { id: ticket.id },
      data: { status: promoted },
    });
  });

  await recordAudit({
    actorUserId: session.userId,
    chamberId: ticket.event.chamberId,
    action: "ticket.promoted_from_waitlist",
    target: ticket.id,
    metadata: { eventId, newStatus: promoted },
  });

  revalidatePath(`/c/${chamberSlug}/admin/events/${eventId}/attendance`);
}

export async function refundTicket(formData: FormData): Promise<void> {
  const { ticketId, chamberSlug, eventId } = ticketActionSchema.parse({
    ticketId: formData.get("ticketId"),
    chamberSlug: formData.get("chamberSlug"),
    eventId: formData.get("eventId"),
  });

  const session = await requireSession();
  const ticket = await loadTicket(ticketId);
  if (!ticket || ticket.event.id !== eventId) throw new Error("Ticket not found");
  if (!hasChamberRole(session, ticket.event.chamberId, "CHAMBER_ADMIN")) {
    throw new Error("FORBIDDEN");
  }
  if (ticket.status === "REFUNDED") return;

  await prisma.$transaction(async (tx) => {
    await tx.ticket.update({
      where: { id: ticket.id },
      data: { status: "REFUNDED" },
    });
    if (ticket.invoiceId) {
      await tx.invoice.update({
        where: { id: ticket.invoiceId },
        data: { status: "REFUNDED" },
      });
    }
  });

  await recordAudit({
    actorUserId: session.userId,
    chamberId: ticket.event.chamberId,
    action: "ticket.refunded",
    target: ticket.id,
    metadata: { eventId, invoiceId: ticket.invoiceId },
  });

  revalidatePath(`/c/${chamberSlug}/admin/events/${eventId}/attendance`);
}
