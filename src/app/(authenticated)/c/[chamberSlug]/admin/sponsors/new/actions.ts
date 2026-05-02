"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";
import { recordAudit } from "@/lib/audit";

const createSchema = z.object({
  chamberSlug: z.string().min(1),
  name: z.string().min(2).max(200),
  logoUrl: z.string().url().optional().or(z.literal("")),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  blurb: z.string().max(1000).optional(),
});

export async function createSponsor(formData: FormData): Promise<void> {
  const parsed = createSchema.parse({
    chamberSlug: formData.get("chamberSlug"),
    name: formData.get("name"),
    logoUrl: formData.get("logoUrl") || "",
    websiteUrl: formData.get("websiteUrl") || "",
    blurb: formData.get("blurb") || undefined,
  });

  const session = await requireSession();
  const chamber = await prisma.chamber.findUnique({
    where: { slug: parsed.chamberSlug },
    select: { id: true },
  });
  if (!chamber) throw new Error("Chamber not found");
  if (!hasChamberRole(session, chamber.id, "CHAMBER_ADMIN")) {
    throw new Error("FORBIDDEN");
  }

  const sponsor = await prisma.sponsor.create({
    data: {
      chamberId: chamber.id,
      name: parsed.name,
      logoUrl: parsed.logoUrl ? parsed.logoUrl : null,
      websiteUrl: parsed.websiteUrl ? parsed.websiteUrl : null,
      blurb: parsed.blurb ?? null,
    },
  });

  await recordAudit({
    actorUserId: session.userId,
    chamberId: chamber.id,
    action: "sponsor.created",
    target: sponsor.id,
    metadata: { name: sponsor.name },
  });

  revalidatePath(`/c/${parsed.chamberSlug}/admin/sponsors`);
  redirect(`/c/${parsed.chamberSlug}/admin/sponsors`);
}
