"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";
import { recordAudit } from "@/lib/audit";

const addSchema = z.object({
  chamberSlug: z.string().min(1),
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  url: z.string().url(),
  mimeType: z.string().max(100).optional(),
  visibility: z.enum(["BOARD_ONLY", "CHAMBER_ADMIN_ONLY", "ALL_MEMBERS"]),
});

export async function addDocument(formData: FormData): Promise<void> {
  const parsed = addSchema.parse({
    chamberSlug: formData.get("chamberSlug"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    url: formData.get("url"),
    mimeType: formData.get("mimeType") || undefined,
    visibility: formData.get("visibility") || "BOARD_ONLY",
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

  const doc = await prisma.document.create({
    data: {
      chamberId: chamber.id,
      title: parsed.title,
      description: parsed.description ?? null,
      url: parsed.url,
      mimeType: parsed.mimeType ?? null,
      visibility: parsed.visibility,
      uploadedBy: session.userId,
    },
  });

  await recordAudit({
    actorUserId: session.userId,
    chamberId: chamber.id,
    action: "document.added",
    target: doc.id,
    metadata: { title: doc.title, visibility: doc.visibility },
  });

  revalidatePath(`/c/${parsed.chamberSlug}/board/vault`);
  redirect(`/c/${parsed.chamberSlug}/board/vault`);
}
