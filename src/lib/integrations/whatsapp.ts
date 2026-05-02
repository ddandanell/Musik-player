const GRAPH_API_VERSION = "v22.0";

export type SendWhatsAppTextInput = {
  to: string;
  body: string;
};

export type SendWhatsAppTemplateInput = {
  to: string;
  templateName: string;
  languageCode: string;
  components?: unknown[];
};

export type SendWhatsAppResult = {
  messageId: string;
};

type WhatsAppMessageResponse = {
  messages?: Array<{ id: string }>;
  error?: { message?: string; code?: number; type?: string };
};

function getCredentials(): { phoneNumberId: string; accessToken: string } {
  const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID;
  const accessToken = process.env.META_WA_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) {
    throw new Error(
      "WhatsApp Cloud API not configured — set META_WA_PHONE_NUMBER_ID and META_WA_ACCESS_TOKEN",
    );
  }
  return { phoneNumberId, accessToken };
}

async function postMessage(payload: Record<string, unknown>): Promise<SendWhatsAppResult> {
  const { phoneNumberId, accessToken } = getCredentials();
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = (await response.json().catch(() => ({}))) as WhatsAppMessageResponse;

  if (!response.ok) {
    const detail = json.error?.message ?? `HTTP ${response.status}`;
    throw new Error(`WhatsApp send failed: ${detail}`);
  }

  const messageId = json.messages?.[0]?.id;
  if (!messageId) {
    throw new Error("WhatsApp response missing message id");
  }

  return { messageId };
}

export async function sendWhatsAppText(
  input: SendWhatsAppTextInput,
): Promise<SendWhatsAppResult> {
  return postMessage({
    messaging_product: "whatsapp",
    to: input.to,
    type: "text",
    text: { body: input.body },
  });
}

export async function sendWhatsAppTemplate(
  input: SendWhatsAppTemplateInput,
): Promise<SendWhatsAppResult> {
  return postMessage({
    messaging_product: "whatsapp",
    to: input.to,
    type: "template",
    template: {
      name: input.templateName,
      language: { code: input.languageCode },
      ...(input.components ? { components: input.components } : {}),
    },
  });
}
