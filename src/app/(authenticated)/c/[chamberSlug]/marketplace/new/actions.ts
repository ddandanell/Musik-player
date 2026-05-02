"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { chamberRoleFor } from "@/lib/auth/permissions";
import { recordAudit } from "@/lib/audit";

const createSchema = z.object({
  chamberSlug: z.string().min(1),
  title: z.string().min(3).max(160),
  category: z.string().min(2).max(60),
  description: z.string().min(10),
  priceFrom: z.string().optional(),
});

export async function createListing(formData: FormData): Promise<void> {
  const parsed = createSchema.parse({
    chamberSlug: formData.get("chamberSlug"),
    title: formData.get("title"),
    category: formData.get("category"),
    description: formData.get("description"),
    priceFrom: formData.get("priceFrom") || undefined,
  });

  const session = await requireSession();
  const chamber = await prisma.chamber.findUnique({
    where: { slug: parsed.chamberSlug },
    select: { id: true },
  });
  if (!chamber) throw new Error("Chamber not found");
  if (!chamberRoleFor(session, chamber.id)) {
    throw new Error("FORBIDDEN");
  }

  let priceFrom: number | null = null;
  if (parsed.priceFrom) {
    const n = Number(parsed.priceFrom);
    if (Number.isNaN(n) || n < 0) throw new Error("Invalid price");
    priceFrom = n;
  }

  const listing = await prisma.marketplaceListing.create({
    data: {
      chamberId: chamber.id,
      sellerUserId: session.userId,
      title: parsed.title,
      category: parsed.category,
      description: parsed.description,
      priceFrom,
    },
  });

  await recordAudit({
    actorUserId: session.userId,
    chamberId: chamber.id,
    action: "marketplace.created",
    target: listing.id,
    metadata: { title: listing.title, category: listing.category },
  });

  revalidatePath(`/c/${parsed.chamberSlug}/marketplace`);
  redirect(`/c/${parsed.chamberSlug}/marketplace/${listing.id}`);
}
