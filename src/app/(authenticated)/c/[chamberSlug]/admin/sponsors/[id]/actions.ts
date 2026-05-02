"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";
import { recordAudit } from "@/lib/audit";

const idSchema = z.object({
  id: z.string().min(1),
  chamberSlug: z.string().min(1),
});

const updateSchema = idSchema.extend({
  name: z.string().min(2).max(200),
  logoUrl: z.string().url().optional().or(z.literal("")),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  blurb: z.string().max(1000).optional(),
});

async function loadSponsor(id: string, chamberSlug: string) {
  const sponsor = await prisma.sponsor.findUnique({
    where: { id },
    select: { id: true, chamberId: true, name: true },
  });
  if (!sponsor) throw new Error("Sponsor not found");
  const chamber = await prisma.chamber.findUnique({
    where: { slug: chamberSlug },
    select: { id: true },
  });
  if (!chamber || chamber.id !== sponsor.chamberId) {
    throw new Error("Mismatched chamber");
  }
  return { sponsor, chamber };
}

export async function updateSponsor(formData: FormData): Promise<void> {
  const parsed = updateSchema.parse({
    id: formData.get("id"),
    chamberSlug: formData.get("chamberSlug"),
    name: formData.get("name"),
    logoUrl: formData.get("logoUrl") || "",
    websiteUrl: formData.get("websiteUrl") || "",
    blurb: formData.get("blurb") || undefined,
  });

  const session = await requireSession();
  const { sponsor, chamber } = await loadSponsor(parsed.id, parsed.chamberSlug);
  if (!hasChamberRole(session, chamber.id, "CHAMBER_ADMIN")) {
    throw new Error("FORBIDDEN");
  }

  await prisma.sponsor.update({
    where: { id: sponsor.id },
    data: {
      name: parsed.name,
      logoUrl: parsed.logoUrl ? parsed.logoUrl : null,
      websiteUrl: parsed.websiteUrl ? parsed.websiteUrl : null,
      blurb: parsed.blurb ?? null,
    },
  });

  await recordAudit({
    actorUserId: session.userId,
    chamberId: chamber.id,
    action: "sponsor.updated",
    target: sponsor.id,
    metadata: { name: parsed.name },
  });

  revalidatePath(`/c/${parsed.chamberSlug}/admin/sponsors`);
  revalidatePath(`/c/${parsed.chamberSlug}/admin/sponsors/${sponsor.id}`);
}

export async function deleteSponsor(formData: FormData): Promise<void> {
  const parsed = idSchema.parse({
    id: formData.get("id"),
    chamberSlug: formData.get("chamberSlug"),
  });

  const session = await requireSession();
  const { sponsor, chamber } = await loadSponsor(parsed.id, parsed.chamberSlug);
  if (!hasChamberRole(session, chamber.id, "CHAMBER_ADMIN")) {
    throw new Error("FORBIDDEN");
  }

  await prisma.sponsor.delete({ where: { id: sponsor.id } });

  await recordAudit({
    actorUserId: session.userId,
    chamberId: chamber.id,
    action: "sponsor.deleted",
    target: sponsor.id,
    metadata: { name: sponsor.name },
  });

  revalidatePath(`/c/${parsed.chamberSlug}/admin/sponsors`);
  redirect(`/c/${parsed.chamberSlug}/admin/sponsors`);
}
