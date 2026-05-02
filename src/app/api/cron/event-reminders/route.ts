import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notifyByEmail, notifyByWhatsApp } from "@/lib/comms";
import { eventsToRemind, reminderTemplateKey, type ReminderWindow } from "@/lib/reminders";

export const dynamic = "force-dynamic";

function authorize(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorize(request)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const windows = eventsToRemind(now);
  const summary: Record<string, { events: number; sent: number; skipped: number }> = {};

  for (const w of windows) {
    summary[w.window] = { events: 0, sent: 0, skipped: 0 };

    const events = await prisma.event.findMany({
      where: {
        status: "PUBLISHED",
        startsAt: { gte: w.rangeStart, lte: w.rangeEnd },
      },
      include: {
        chamber: { select: { id: true, name: true, slug: true } },
        tickets: {
          where: { status: { in: ["RESERVED", "PAID"] } },
          include: { user: { select: { email: true, phone: true, name: true } } },
        },
      },
    });

    summary[w.window].events = events.length;

    for (const event of events) {
      const templateKey = reminderTemplateKey(event.id, w.window as ReminderWindow);

      const alreadySent = await prisma.communicationLog.findFirst({
        where: { chamberId: event.chamberId, templateKey },
        select: { id: true },
      });
      if (alreadySent) {
        summary[w.window].skipped += event.tickets.length;
        continue;
      }

      const startsAt = event.startsAt.toISOString().replace("T", " ").slice(0, 16);
      const subject = `Reminder: ${event.title}`;
      const baseBody = `Hi {NAME},\n\nReminder that "${event.title}" starts ${startsAt}.\n${event.location ? `Location: ${event.location}\n` : ""}\nSee you there.\n— ${event.chamber.name}`;
      const html = `<p>Reminder that <strong>${event.title}</strong> starts ${startsAt}.</p>${event.location ? `<p>Location: ${event.location}</p>` : ""}<p>— ${event.chamber.name}</p>`;

      for (const ticket of event.tickets) {
        const personalised = baseBody.replace("{NAME}", ticket.user.name ?? "there");

        if (ticket.user.email) {
          try {
            await notifyByEmail({
              chamberId: event.chamberId,
              to: ticket.user.email,
              subject,
              html: html.replace("{NAME}", ticket.user.name ?? "there"),
              templateKey,
            });
            summary[w.window].sent += 1;
          } catch {
            // notifyByEmail already wrote a delivered=false log row
          }
        }

        if (ticket.user.phone) {
          try {
            await notifyByWhatsApp({
              chamberId: event.chamberId,
              to: ticket.user.phone,
              body: personalised,
              templateKey,
            });
          } catch {
            // logged already
          }
        }
      }
    }
  }

  return NextResponse.json({ ok: true, ranAt: now.toISOString(), summary });
}
