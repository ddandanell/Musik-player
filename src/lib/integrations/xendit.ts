import { Xendit } from "xendit-node";

export type CreateXenditInvoiceInput = {
  externalId: string;
  amount: number;
  currency: string;
  payerEmail: string;
  description: string;
  successUrl?: string;
  failureUrl?: string;
};

export type CreateXenditInvoiceResult = {
  invoiceUrl: string;
  invoiceId: string;
};

let cachedClient: Xendit | null = null;

function getClient(): Xendit {
  if (cachedClient) return cachedClient;
  const secretKey = process.env.XENDIT_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "XENDIT_SECRET_KEY is not set — configure it before creating Xendit invoices",
    );
  }
  cachedClient = new Xendit({ secretKey });
  return cachedClient;
}

export async function createXenditInvoice(
  input: CreateXenditInvoiceInput,
): Promise<CreateXenditInvoiceResult> {
  const client = getClient();
  const created = await client.Invoice.createInvoice({
    data: {
      externalId: input.externalId,
      amount: input.amount,
      currency: input.currency,
      payerEmail: input.payerEmail,
      description: input.description,
      successRedirectUrl: input.successUrl,
      failureRedirectUrl: input.failureUrl,
    },
  });

  if (!created.id || !created.invoiceUrl) {
    throw new Error("Xendit returned an invoice without id or invoiceUrl");
  }

  return {
    invoiceId: created.id,
    invoiceUrl: created.invoiceUrl,
  };
}
