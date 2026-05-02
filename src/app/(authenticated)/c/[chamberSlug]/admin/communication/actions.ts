"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";
import { recordAudit } from "@/lib/audit";
import { notifyByEmail, notifyByWhatsApp } from "@/lib/comms";

const broadcastSchema = z
  .object({
    chamberSlug: z.string().min(1),
    channel: z.enum(["EMAIL", "WHATSAPP"]),
    recipient: z.string().min(1),
    subject: z.string().optional(),
    body: z.string().min(1, "Body is required"),
  })
  .refine(
    (value) => value.channel !== "EMAIL" || (value.subject && value.subject.trim().length > 0),
    { message: "Subject is required for email", path: ["subject"] },
  );

export type BroadcastResult =
  | { ok: true }
  | { ok: false; error: string };

export async function sendBroadcast(formData: FormData): Promise<BroadcastResult> {
  const parsed = broadcastSchema.safeParse({
    chamberSlug: formData.get("chamberSlug"),
    channel: formData.get("channel"),
    recipient: formData.get("recipient"),
    subject: formData.get("subject") ?? undefined,
    body: formData.get("body"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { chamberSlug, channel, recipient, subject, body } = parsed.data;

  const session = await requireSession();
  const chamber = await prisma.chamber.findUnique({
    where: { slug: chamberSlug },
    select: { id: true },
  });
  if (!chamber) return { ok: false, error: "Chamber not found" };
  if (!hasChamberRole(session, chamber.id, "CHAMBER_ADMIN")) {
    return { ok: false, error: "FORBIDDEN" };
  }

  try {
    if (channel === "EMAIL") {
      await notifyByEmail({
        chamberId: chamber.id,
        to: recipient,
        subject: subject ?? "(no subject)",
        html: `<div>${escapeHtml(body).replace(/\n/g, "<br/>")}</div>`,
        text: body,
        templateKey: "admin.broadcast",
        sentByUserId: session.userId,
      });
    } else {
      await notifyByWhatsApp({
        chamberId: chamber.id,
        to: recipient,
        body,
        templateKey: "admin.broadcast",
        sentByUserId: session.userId,
      });
    }

    await recordAudit({
      actorUserId: session.userId,
      chamberId: chamber.id,
      action: "comms.sent",
      target: recipient,
      metadata: { channel, templateKey: "admin.broadcast" },
    });

    revalidatePath(`/c/${chamberSlug}/admin/communication`);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Send failed";
    return { ok: false, error: message };
  }
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
