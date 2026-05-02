import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IncomingMessage = {
  from?: string;
  id?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
};

type IncomingValue = {
  metadata?: { phone_number_id?: string };
  messages?: IncomingMessage[];
};

type IncomingChange = { value?: IncomingValue; field?: string };
type IncomingEntry = { id?: string; changes?: IncomingChange[] };
type IncomingPayload = { object?: string; entry?: IncomingEntry[] };

export async function GET(request: Request): Promise<NextResponse | Response> {
  const verifyToken = process.env.META_WA_VERIFY_TOKEN;
  if (!verifyToken) {
    return NextResponse.json({ error: "Verify token not configured" }, { status: 500 });
  }

  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(request: Request): Promise<NextResponse> {
  let payload: IncomingPayload;
  try {
    payload = (await request.json()) as IncomingPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID;
  const chamber = await prisma.chamber.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (!chamber) {
    return NextResponse.json({ ok: true, ignored: "no chamber" });
  }

  const entries = payload.entry ?? [];
  for (const entry of entries) {
    const changes = entry.changes ?? [];
    for (const change of changes) {
      const messages = change.value?.messages ?? [];
      for (const message of messages) {
        const logPayload: Prisma.InputJsonValue = {
          direction: "inbound",
          providerMessageId: message.id ?? null,
          from: message.from ?? null,
          type: message.type ?? null,
          text: message.text?.body ?? null,
          timestamp: message.timestamp ?? null,
          phoneNumberId: change.value?.metadata?.phone_number_id ?? phoneNumberId ?? null,
        };
        try {
          await prisma.communicationLog.create({
            data: {
              chamberId: chamber.id,
              channel: "WHATSAPP",
              recipientPhone: message.from ?? null,
              payload: logPayload,
              delivered: true,
            },
          });
        } catch (logError) {
          console.error("[wa-webhook] failed to log inbound message", logError);
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
