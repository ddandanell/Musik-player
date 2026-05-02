"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";
import { recordAudit } from "@/lib/audit";

const baseSchema = z.object({
  id: z.string().min(1),
  chamberSlug: z.string().min(1),
});

const updateSchema = baseSchema.extend({
  title: z.string().min(3).max(160),
  category: z.string().min(2).max(60),
  description: z.string().min(10),
  priceFrom: z.string().optional(),
});

async function loadListing(id: string, chamberSlug: string) {
  const listing = await prisma.marketplaceListing.findUnique({
    where: { id },
    include: { chamber: { select: { id: true, slug: true } } },
  });
  if (!listing) throw new Error("Listing not found");
  if (listing.chamber.slug !== chamberSlug) throw new Error("Mismatched chamber");
  return listing;
}

function canMutate(
  listing: { sellerUserId: string; chamberId: string },
  session: { userId: string },
  isAdmin: boolean,
): boolean {
  return listing.sellerUserId === session.userId || isAdmin;
}

export async function updateListing(formData: FormData): Promise<void> {
  const parsed = updateSchema.parse({
    id: formData.get("id"),
    chamberSlug: formData.get("chamberSlug"),
    title: formData.get("title"),
    category: formData.get("category"),
    description: formData.get("description"),
    priceFrom: formData.get("priceFrom") || undefined,
  });

  const session = await requireSession();
  const listing = await loadListing(parsed.id, parsed.chamberSlug);
  const isAdmin = hasChamberRole(session, listing.chamberId, "CHAMBER_ADMIN");
  if (!canMutate(listing, session, isAdmin)) throw new Error("FORBIDDEN");

  let priceFrom: number | null = null;
  if (parsed.priceFrom) {
    const n = Number(parsed.priceFrom);
    if (Number.isNaN(n) || n < 0) throw new Error("Invalid price");
    priceFrom = n;
  }

  await prisma.marketplaceListing.update({
    where: { id: listing.id },
    data: {
      title: parsed.title,
      category: parsed.category,
      description: parsed.description,
      priceFrom,
    },
  });

  await recordAudit({
    actorUserId: session.userId,
    chamberId: listing.chamberId,
    action: "marketplace.updated",
    target: listing.id,
  });

  revalidatePath(`/c/${parsed.chamberSlug}/marketplace`);
  revalidatePath(`/c/${parsed.chamberSlug}/marketplace/${listing.id}`);
}

export async function deleteListing(formData: FormData): Promise<void> {
  const parsed = baseSchema.parse({
    id: formData.get("id"),
    chamberSlug: formData.get("chamberSlug"),
  });

  const session = await requireSession();
  const listing = await loadListing(parsed.id, parsed.chamberSlug);
  const isAdmin = hasChamberRole(session, listing.chamberId, "CHAMBER_ADMIN");
  if (!canMutate(listing, session, isAdmin)) throw new Error("FORBIDDEN");

  await prisma.marketplaceListing.delete({ where: { id: listing.id } });

  await recordAudit({
    actorUserId: session.userId,
    chamberId: listing.chamberId,
    action: "marketplace.deleted",
    target: listing.id,
    metadata: { title: listing.title },
  });

  revalidatePath(`/c/${parsed.chamberSlug}/marketplace`);
  redirect(`/c/${parsed.chamberSlug}/marketplace`);
}
