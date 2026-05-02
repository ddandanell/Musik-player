"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { assertPlatformOperator } from "@/lib/auth/permissions";
import { recordAudit } from "@/lib/audit";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const createSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(slugRegex, "Slug must be kebab-case (lowercase letters, digits, hyphens)"),
  name: z.string().min(2).max(160),
  country: z.string().min(2).max(80),
  currency: z.string().min(3).max(8).default("IDR"),
  brandColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Brand color must be a 6-digit hex")
    .default("#0B5FFF"),
  licenseFee: z.string().min(1),
  txFeeBps: z.string().min(1),
  initialAdminEmail: z.string().email().optional(),
});

export async function createChamber(formData: FormData): Promise<void> {
  const parsed = createSchema.parse({
    slug: formData.get("slug"),
    name: formData.get("name"),
    country: formData.get("country"),
    currency: formData.get("currency") || "IDR",
    brandColor: formData.get("brandColor") || "#0B5FFF",
    licenseFee: formData.get("licenseFee"),
    txFeeBps: formData.get("txFeeBps"),
    initialAdminEmail: formData.get("initialAdminEmail")
      ? String(formData.get("initialAdminEmail")).toLowerCase()
      : undefined,
  });

  const session = await requireSession();
  assertPlatformOperator(session);

  const existing = await prisma.chamber.findUnique({
    where: { slug: parsed.slug },
    select: { id: true },
  });
  if (existing) throw new Error("Slug already in use");

  const licenseFee = Number(parsed.licenseFee);
  const txFeeBps = Number(parsed.txFeeBps);
  if (Number.isNaN(licenseFee) || licenseFee < 0) throw new Error("Invalid license fee");
  if (!Number.isInteger(txFeeBps) || txFeeBps < 0) throw new Error("Invalid tx fee");

  const chamber = await prisma.$transaction(async (tx) => {
    const created = await tx.chamber.create({
      data: {
        slug: parsed.slug,
        name: parsed.name,
        country: parsed.country,
        currency: parsed.currency,
        brandColor: parsed.brandColor,
        licenseFee,
        txFeeBps,
        status: "ACTIVE",
      },
    });

    await tx.membershipTier.create({
      data: {
        chamberId: created.id,
        name: "Standard",
        price: 0,
        durationDays: 365,
      },
    });

    if (parsed.initialAdminEmail) {
      const user = await tx.user.upsert({
        where: { email: parsed.initialAdminEmail },
        update: {},
        create: { email: parsed.initialAdminEmail },
      });
      await tx.membership.upsert({
        where: { chamberId_userId: { chamberId: created.id, userId: user.id } },
        update: { role: "CHAMBER_ADMIN", status: "ACTIVE" },
        create: {
          chamberId: created.id,
          userId: user.id,
          role: "CHAMBER_ADMIN",
          status: "ACTIVE",
        },
      });
    }

    return created;
  });

  await recordAudit({
    actorUserId: session.userId,
    chamberId: chamber.id,
    action: "chamber.created",
    target: chamber.id,
    metadata: {
      slug: chamber.slug,
      country: chamber.country,
      initialAdminEmail: parsed.initialAdminEmail ?? null,
    },
  });

  revalidatePath("/operator/chambers");
  redirect("/operator/chambers");
}
