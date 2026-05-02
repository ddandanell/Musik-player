import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_USER_EMAIL = "system@danchamp.internal";

const xenditPayloadSchema = z.object({
  id: z.string().min(1),
  external_id: z.string().min(1),
  status: z.string().min(1),
  amount: z.number().optional(),
  paid_amount: z.number().optional(),
  payment_method: z.string().optional(),
  paid_at: z.string().optional(),
});

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function resolveActorUserId(chamberId: string): Promise<string> {
  const admin = await prisma.membership.findFirst({
    where: { chamberId, role: "CHAMBER_ADMIN", status: "ACTIVE" },
    select: { userId: true },
  });
  if (admin?.userId) return admin.userId;

  const fallback = await prisma.user.upsert({
    where: { email: SYSTEM_USER_EMAIL },
    update: {},
    create: { email: SYSTEM_USER_EMAIL, name: "DanChamp System" },
    select: { id: true },
  });
  return fallback.id;
}

export async function POST(request: Request): Promise<NextResponse> {
  const expectedToken = process.env.XENDIT_WEBHOOK_TOKEN;
  if (!expectedToken) {
    console.error("[xendit-webhook] XENDIT_WEBHOOK_TOKEN not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const providedToken = request.headers.get("x-callback-token") ?? "";
  if (!timingSafeEqual(providedToken, expectedToken)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const rawBody = await request.text();
  let parsed: z.infer<typeof xenditPayloadSchema>;
  try {
    parsed = xenditPayloadSchema.parse(JSON.parse(rawBody));
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (parsed.status.toUpperCase() !== "PAID") {
    return NextResponse.json({ ok: true, ignored: parsed.status });
  }

  const invoice = await prisma.invoice.findFirst({
    where: {
      OR: [{ externalRef: parsed.id }, { externalRef: parsed.external_id }],
    },
    include: { tickets: { select: { id: true } } },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (invoice.status === "PAID") {
    return NextResponse.json({ ok: true, idempotent: true });
  }

  const paidAt = parsed.paid_at ? new Date(parsed.paid_at) : new Date();

  await prisma.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id: invoice.id },
      data: { status: "PAID", paidAt },
    });
    if (invoice.tickets.length > 0) {
      await tx.ticket.updateMany({
        where: { invoiceId: invoice.id },
        data: { status: "PAID" },
      });
    }
  });

  const actorUserId = await resolveActorUserId(invoice.chamberId);
  await recordAudit({
    actorUserId,
    chamberId: invoice.chamberId,
    action: "invoice.paid",
    target: invoice.id,
    metadata: {
      source: "xendit_webhook",
      xenditInvoiceId: parsed.id,
      externalId: parsed.external_id,
      amount: parsed.paid_amount ?? parsed.amount ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
