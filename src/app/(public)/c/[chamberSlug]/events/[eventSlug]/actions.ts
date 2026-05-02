"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { chamberRoleFor } from "@/lib/auth/permissions";
import { createXenditInvoice } from "@/lib/integrations/xendit";

const rsvpSchema = z.object({
  chamberSlug: z.string().min(1),
  eventSlug: z.string().min(1),
});

export async function rsvpToEvent(formData: FormData): Promise<void> {
  const parsed = rsvpSchema.parse({
    chamberSlug: formData.get("chamberSlug"),
    eventSlug: formData.get("eventSlug"),
  });

  const session = await requireSession();
  const chamber = await prisma.chamber.findUnique({
    where: { slug: parsed.chamberSlug },
    select: { id: true, currency: true },
  });
  if (!chamber) throw new Error("Chamber not found");

  const event = await prisma.event.findUnique({
    where: { chamberId_slug: { chamberId: chamber.id, slug: parsed.eventSlug } },
    include: {
      ticketTypes: { orderBy: { price: "asc" }, take: 1 },
      _count: {
        select: {
          tickets: { where: { status: { in: ["RESERVED", "PAID", "CHECKED_IN"] } } },
        },
      },
    },
  });
  if (!event) throw new Error("Event not found");
  if (event.status !== "PUBLISHED") throw new Error("Event not open for RSVP");

  const role = chamberRoleFor(session, chamber.id);
  if (event.visibility !== "PUBLIC" && !role) {
    throw new Error("FORBIDDEN");
  }
  if (event.visibility === "BOARD_ONLY" && role !== "BOARD_MEMBER" && role !== "CHAMBER_ADMIN") {
    throw new Error("FORBIDDEN");
  }

  const existing = await prisma.ticket.findUnique({
    where: { eventId_userId: { eventId: event.id, userId: session.userId } },
    select: { id: true, status: true },
  });
  if (existing) {
    revalidatePath(`/c/${parsed.chamberSlug}/events/${parsed.eventSlug}`);
    return;
  }

  const ticketType = event.ticketTypes[0];
  if (!ticketType) throw new Error("No ticket type configured");

  const reservedCount = event._count.tickets;
  const isFull = event.capacity != null && reservedCount >= event.capacity;
  const status = isFull ? "WAITLISTED" : "RESERVED";

  const price = Number(ticketType.price.toString());
  const isFree = price <= 0;
  const needsPayment = !isFree && status !== "WAITLISTED";

  const created = await prisma.$transaction(async (tx) => {
    let invoiceId: string | null = null;
    let invoiceNumber: string | null = null;

    if (needsPayment) {
      invoiceNumber = `EVT-${event.id.slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      const invoice = await tx.invoice.create({
        data: {
          chamberId: chamber.id,
          number: invoiceNumber,
          payerEmail: session.email,
          amount: price,
          currency: chamber.currency,
          status: "OPEN",
          description: `${event.title} — ${ticketType.name}`,
        },
      });
      invoiceId = invoice.id;
    }

    await tx.ticket.create({
      data: {
        eventId: event.id,
        ticketTypeId: ticketType.id,
        userId: session.userId,
        status,
        invoiceId,
      },
    });

    return { invoiceId, invoiceNumber };
  });

  if (needsPayment && created.invoiceId && created.invoiceNumber) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const eventPath = `/c/${parsed.chamberSlug}/events/${parsed.eventSlug}`;
    let redirectTarget = `${eventPath}?payment=pending`;
    try {
      const xendit = await createXenditInvoice({
        externalId: created.invoiceNumber,
        amount: price,
        currency: chamber.currency,
        payerEmail: session.email,
        description: `${event.title} — ${ticketType.name}`,
        successUrl: `${appUrl}${eventPath}?paid=1`,
        failureUrl: `${appUrl}${eventPath}?paid=0`,
      });
      await prisma.invoice.update({
        where: { id: created.invoiceId },
        data: { externalRef: xendit.invoiceId, paymentUrl: xendit.invoiceUrl },
      });
      redirectTarget = xendit.invoiceUrl;
    } catch (error) {
      console.error("[rsvp] xendit invoice creation failed", error);
    }
    revalidatePath(eventPath);
    revalidatePath(`/c/${parsed.chamberSlug}/admin/events/${event.id}`);
    redirect(redirectTarget);
  }

  revalidatePath(`/c/${parsed.chamberSlug}/events/${parsed.eventSlug}`);
  revalidatePath(`/c/${parsed.chamberSlug}/admin/events/${event.id}`);
}
