"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";
import { recordAudit } from "@/lib/audit";

const updateSchema = z.object({
  chamberSlug: z.string().min(1),
  name: z.string().min(2),
  country: z.string().min(2),
  currency: z.string().regex(/^[A-Z]{3}$/, "3-letter ISO currency code"),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Hex color #RRGGBB"),
  logoUrl: z
    .string()
    .url()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  txFeeBps: z.coerce.number().int().min(0).max(10_000),
});

export async function updateChamberSettings(formData: FormData): Promise<void> {
  const parsed = updateSchema.parse({
    chamberSlug: formData.get("chamberSlug"),
    name: formData.get("name"),
    country: formData.get("country"),
    currency: String(formData.get("currency") ?? "").toUpperCase(),
    brandColor: formData.get("brandColor"),
    logoUrl: formData.get("logoUrl") ?? "",
    txFeeBps: formData.get("txFeeBps"),
  });

  const session = await requireSession();
  const chamber = await prisma.chamber.findUnique({
    where: { slug: parsed.chamberSlug },
    select: {
      id: true,
      name: true,
      country: true,
      currency: true,
      brandColor: true,
      logoUrl: true,
      txFeeBps: true,
    },
  });
  if (!chamber) throw new Error("Chamber not found");
  if (!hasChamberRole(session, chamber.id, "CHAMBER_ADMIN")) {
    throw new Error("FORBIDDEN");
  }

  await prisma.chamber.update({
    where: { id: chamber.id },
    data: {
      name: parsed.name,
      country: parsed.country,
      currency: parsed.currency,
      brandColor: parsed.brandColor,
      logoUrl: parsed.logoUrl ?? null,
      txFeeBps: parsed.txFeeBps,
    },
  });

  await recordAudit({
    actorUserId: session.userId,
    chamberId: chamber.id,
    action: "chamber.settings_updated",
    target: chamber.id,
    metadata: {
      previous: chamber,
      next: parsed,
    },
  });

  revalidatePath(`/c/${parsed.chamberSlug}/admin/settings`);
  revalidatePath(`/c/${parsed.chamberSlug}`);
}
