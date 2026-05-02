"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";
import { recordAudit } from "@/lib/audit";

const slugify = (input: string): string =>
  input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);

function parseTags(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

const createSchema = z.object({
  chamberSlug: z.string().min(1),
  title: z.string().min(3).max(200),
  body: z.string().min(10),
  tags: z.string().optional(),
  isPublic: z.string().optional(),
});

export async function createArticle(formData: FormData): Promise<void> {
  const parsed = createSchema.parse({
    chamberSlug: formData.get("chamberSlug"),
    title: formData.get("title"),
    body: formData.get("body"),
    tags: formData.get("tags") || undefined,
    isPublic: formData.get("isPublic") || undefined,
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

  const baseSlug = slugify(parsed.title);
  if (!baseSlug) throw new Error("Slug cannot be empty");

  let candidate = baseSlug;
  let suffix = 1;
  while (
    await prisma.knowledgeArticle.findUnique({
      where: { chamberId_slug: { chamberId: chamber.id, slug: candidate } },
      select: { id: true },
    })
  ) {
    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }

  const article = await prisma.knowledgeArticle.create({
    data: {
      chamberId: chamber.id,
      slug: candidate,
      title: parsed.title,
      body: parsed.body,
      tags: parseTags(parsed.tags),
      isPublic: parsed.isPublic === "on",
    },
  });

  await recordAudit({
    actorUserId: session.userId,
    chamberId: chamber.id,
    action: "knowledge.created",
    target: article.id,
    metadata: { slug: article.slug, title: article.title },
  });

  revalidatePath(`/c/${parsed.chamberSlug}/knowledge`);
  revalidatePath(`/c/${parsed.chamberSlug}/admin/knowledge`);
  redirect(`/c/${parsed.chamberSlug}/admin/knowledge/${article.id}`);
}
