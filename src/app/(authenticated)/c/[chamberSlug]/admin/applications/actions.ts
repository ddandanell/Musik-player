"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";
import { recordAudit } from "@/lib/audit";
import { createXenditInvoice } from "@/lib/integrations/xendit";
import { notifyByEmail } from "@/lib/comms";

const decisionSchema = z.object({
  applicationId: z.string().min(1),
  chamberSlug: z.string().min(1),
});

export async function approveApplication(formData: FormData): Promise<void> {
  const { applicationId, chamberSlug } = decisionSchema.parse({
    applicationId: formData.get("applicationId"),
    chamberSlug: formData.get("chamberSlug"),
  });

  const session = await requireSession();
  const application = await prisma.membershipApplication.findUnique({
    where: { id: applicationId },
    include: {
      chamber: { select: { id: true, slug: true, name: true, currency: true } },
      tier: { select: { id: true, name: true, price: true } },
    },
  });
  if (!application) throw new Error("Application not found");
  if (application.chamber.slug !== chamberSlug) throw new Error("Mismatched chamber");
  if (!hasChamberRole(session, application.chamberId, "CHAMBER_ADMIN")) {
    throw new Error("FORBIDDEN");
  }
  if (application.status !== "PENDING_REVIEW" && application.status !== "PENDING_BOARD_VOTE") {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email: application.applicantEmail },
      update: { name: application.applicantName },
      create: {
        email: application.applicantEmail,
        name: application.applicantName,
      },
    });

    await tx.membership.upsert({
      where: { chamberId_userId: { chamberId: application.chamberId, userId: user.id } },
      update: { status: "ACTIVE", tierId: application.tierId ?? undefined },
      create: {
        chamberId: application.chamberId,
        userId: user.id,
        tierId: application.tierId ?? undefined,
        role: "BUSINESS_MEMBER",
        status: "ACTIVE",
      },
    });

    await tx.membershipApplication.update({
      where: { id: application.id },
      data: {
        status: "ACTIVE",
        decidedAt: new Date(),
        decidedBy: session.userId,
      },
    });
  });

  await recordAudit({
    actorUserId: session.userId,
    chamberId: application.chamberId,
    action: "application.approved",
    target: application.id,
    metadata: { applicantEmail: application.applicantEmail },
  });

  const tier = application.tier;
  const tierPrice = tier ? Number(tier.price.toString()) : 0;
  if (tier && tierPrice > 0) {
    const number = await nextMembershipInvoiceNumber(application.chamberId);
    const description = `${tier.name} membership — ${application.chamber.name}`;
    const invoice = await prisma.invoice.create({
      data: {
        chamberId: application.chamberId,
        number,
        payerEmail: application.applicantEmail,
        amount: tierPrice,
        currency: application.chamber.currency,
        status: "OPEN",
        description,
      },
    });

    let paymentUrl: string | null = null;
    let externalRef: string | null = null;
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
      const xendit = await createXenditInvoice({
        externalId: invoice.number,
        amount: tierPrice,
        currency: invoice.currency,
        payerEmail: application.applicantEmail,
        description,
        successUrl: `${appUrl}/pay/${invoice.id}?paid=1`,
        failureUrl: `${appUrl}/pay/${invoice.id}?paid=0`,
      });
      paymentUrl = xendit.invoiceUrl;
      externalRef = xendit.invoiceId;
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { paymentUrl, externalRef },
      });
    } catch (error) {
      console.error("[application.approve] xendit invoice creation failed", error);
    }

    await recordAudit({
      actorUserId: session.userId,
      chamberId: application.chamberId,
      action: "application.invoiced",
      target: invoice.id,
      metadata: { invoiceNumber: invoice.number, hasPaymentUrl: paymentUrl !== null },
    });

    if (paymentUrl && process.env.RESEND_API_KEY) {
      try {
        await notifyByEmail({
          chamberId: application.chamberId,
          to: application.applicantEmail,
          subject: `Your ${application.chamber.name} membership invoice`,
          templateKey: "membership.invoice",
          html: renderMembershipInvoiceEmail({
            applicantName: application.applicantName,
            chamberName: application.chamber.name,
            tierName: tier.name,
            amount: tierPrice,
            currency: invoice.currency,
            paymentUrl,
          }),
          sentByUserId: session.userId,
        });
      } catch (error) {
        console.error("[application.approve] payment email failed", error);
      }
    }
  }

  revalidatePath(`/c/${chamberSlug}/admin/applications`);
  revalidatePath(`/c/${chamberSlug}/admin/members`);
}

async function nextMembershipInvoiceNumber(chamberId: string): Promise<string> {
  const year = new Date().getUTCFullYear();
  const count = await prisma.invoice.count({ where: { chamberId } });
  const seq = (count + 1).toString().padStart(4, "0");
  return `MEM-${year}-${seq}`;
}

function renderMembershipInvoiceEmail(params: {
  applicantName: string;
  chamberName: string;
  tierName: string;
  amount: number;
  currency: string;
  paymentUrl: string;
}): string {
  const safe = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const amountStr = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: params.currency,
    maximumFractionDigits: params.currency === "IDR" ? 0 : 2,
  }).format(params.amount);
  return `
    <p>Hi ${safe(params.applicantName)},</p>
    <p>Welcome to ${safe(params.chamberName)}. Your application for the
    <strong>${safe(params.tierName)}</strong> tier has been approved.</p>
    <p>Please complete payment of <strong>${safe(amountStr)}</strong> to activate your membership:</p>
    <p><a href="${safe(params.paymentUrl)}" style="display:inline-block;background:#0B5FFF;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">Pay invoice</a></p>
    <p>If the button does not work, copy this link: ${safe(params.paymentUrl)}</p>
  `;
}

export async function rejectApplication(formData: FormData): Promise<void> {
  const { applicationId, chamberSlug } = decisionSchema.parse({
    applicationId: formData.get("applicationId"),
    chamberSlug: formData.get("chamberSlug"),
  });

  const session = await requireSession();
  const application = await prisma.membershipApplication.findUnique({
    where: { id: applicationId },
    select: { id: true, chamberId: true, status: true, applicantEmail: true },
  });
  if (!application) throw new Error("Application not found");
  if (!hasChamberRole(session, application.chamberId, "CHAMBER_ADMIN")) {
    throw new Error("FORBIDDEN");
  }
  if (application.status !== "PENDING_REVIEW" && application.status !== "PENDING_BOARD_VOTE") {
    return;
  }

  await prisma.membershipApplication.update({
    where: { id: application.id },
    data: { status: "REJECTED", decidedAt: new Date(), decidedBy: session.userId },
  });

  await recordAudit({
    actorUserId: session.userId,
    chamberId: application.chamberId,
    action: "application.rejected",
    target: application.id,
    metadata: { applicantEmail: application.applicantEmail },
  });

  revalidatePath(`/c/${chamberSlug}/admin/applications`);
}

export async function sendToBoard(formData: FormData): Promise<void> {
  const { applicationId, chamberSlug } = decisionSchema.parse({
    applicationId: formData.get("applicationId"),
    chamberSlug: formData.get("chamberSlug"),
  });

  const session = await requireSession();
  const application = await prisma.membershipApplication.findUnique({
    where: { id: applicationId },
    select: { id: true, chamberId: true, status: true },
  });
  if (!application) throw new Error("Application not found");
  if (!hasChamberRole(session, application.chamberId, "CHAMBER_ADMIN")) {
    throw new Error("FORBIDDEN");
  }
  if (application.status !== "PENDING_REVIEW") return;

  await prisma.membershipApplication.update({
    where: { id: application.id },
    data: { status: "PENDING_BOARD_VOTE" },
  });

  await recordAudit({
    actorUserId: session.userId,
    chamberId: application.chamberId,
    action: "application.escalated_to_board",
    target: application.id,
  });

  revalidatePath(`/c/${chamberSlug}/admin/applications`);
}
