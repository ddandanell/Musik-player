import type { CommunicationChannel, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/integrations/resend";
import { sendWhatsAppText } from "@/lib/integrations/whatsapp";

type LogPayload = Prisma.InputJsonValue;

export type SendCommunicationInput<T> = {
  chamberId: string;
  channel: CommunicationChannel;
  templateKey?: string | null;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  payload: LogPayload;
  sentByUserId?: string | null;
  send: () => Promise<T>;
};

export async function sendCommunication<T>(input: SendCommunicationInput<T>): Promise<T> {
  let result: T | undefined;
  let delivered = false;
  let errorMessage: string | undefined;

  try {
    result = await input.send();
    delivered = true;
    return result;
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unknown send error";
    throw error;
  } finally {
    const augmentedPayload: LogPayload =
      errorMessage !== undefined
        ? ({ ...(input.payload as Record<string, unknown>), error: errorMessage } as LogPayload)
        : input.payload;

    try {
      await prisma.communicationLog.create({
        data: {
          chamberId: input.chamberId,
          channel: input.channel,
          templateKey: input.templateKey ?? null,
          recipientEmail: input.recipientEmail ?? null,
          recipientPhone: input.recipientPhone ?? null,
          payload: augmentedPayload,
          sentById: input.sentByUserId ?? null,
          delivered,
        },
      });
    } catch (logError) {
      console.error("[comms] failed to write communication log", logError);
    }
  }
}

export type NotifyByEmailInput = {
  chamberId: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  templateKey?: string;
  sentByUserId?: string;
};

export async function notifyByEmail(input: NotifyByEmailInput): Promise<void> {
  await sendCommunication({
    chamberId: input.chamberId,
    channel: "EMAIL",
    templateKey: input.templateKey,
    recipientEmail: input.to,
    payload: {
      subject: input.subject,
      preview: input.text ?? input.html.replace(/<[^>]+>/g, "").slice(0, 240),
    },
    sentByUserId: input.sentByUserId,
    send: () =>
      sendEmail({
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
  });
}

export type NotifyByWhatsAppInput = {
  chamberId: string;
  to: string;
  body: string;
  templateKey?: string;
  sentByUserId?: string;
};

export async function notifyByWhatsApp(input: NotifyByWhatsAppInput): Promise<void> {
  await sendCommunication({
    chamberId: input.chamberId,
    channel: "WHATSAPP",
    templateKey: input.templateKey,
    recipientPhone: input.to,
    payload: { body: input.body },
    sentByUserId: input.sentByUserId,
    send: () => sendWhatsAppText({ to: input.to, body: input.body }),
  });
}
