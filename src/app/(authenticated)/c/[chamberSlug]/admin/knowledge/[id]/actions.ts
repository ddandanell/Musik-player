"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";
import { recordAudit } from "@/lib/audit";

function parseTags(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

const baseSchema = z.object({
  id: z.string().min(1),
  chamberSlug: z.string().min(1),
});

const updateSchema = baseSchema.extend({
  title: z.string().min(3).max(200),
  body: z.string().min(10),
  tags: z.string().optional(),
  isPublic: z.string().optional(),
});

async function loadArticle(id: string, chamberSlug: string) {
  const article = await prisma.knowledgeArticle.findUnique({
    where: { id },
    include: { chamber: { select: { id: true, slug: true } } },
  });
  if (!article) throw new Error("Article not found");
  if (article.chamber.slug !== chamberSlug) throw new Error("Mismatched chamber");
  return article;
}

export async function updateArticle(formData: FormData): Promise<void> {
  const parsed = updateSchema.parse({
    id: formData.get("id"),
    chamberSlug: formData.get("chamberSlug"),
    title: formData.get("title"),
    body: formData.get("body"),
    tags: formData.get("tags") || undefined,
    isPublic: formData.get("isPublic") || undefined,
  });

  const session = await requireSession();
  const article = await loadArticle(parsed.id, parsed.chamberSlug);
  if (!hasChamberRole(session, article.chamberId, "CHAMBER_ADMIN")) {
    throw new Error("FORBIDDEN");
  }

  await prisma.knowledgeArticle.update({
    where: { id: article.id },
    data: {
      title: parsed.title,
      body: parsed.body,
      tags: parseTags(parsed.tags),
      isPublic: parsed.isPublic === "on",
    },
  });

  await recordAudit({
    actorUserId: session.userId,
    chamberId: article.chamberId,
    action: "knowledge.updated",
    target: article.id,
  });

  revalidatePath(`/c/${parsed.chamberSlug}/knowledge`);
  revalidatePath(`/c/${parsed.chamberSlug}/knowledge/${article.slug}`);
  revalidatePath(`/c/${parsed.chamberSlug}/admin/knowledge`);
  revalidatePath(`/c/${parsed.chamberSlug}/admin/knowledge/${article.id}`);
}

export async function deleteArticle(formData: FormData): Promise<void> {
  const parsed = baseSchema.parse({
    id: formData.get("id"),
    chamberSlug: formData.get("chamberSlug"),
  });

  const session = await requireSession();
  const article = await loadArticle(parsed.id, parsed.chamberSlug);
  if (!hasChamberRole(session, article.chamberId, "CHAMBER_ADMIN")) {
    throw new Error("FORBIDDEN");
  }

  await prisma.knowledgeArticle.delete({ where: { id: article.id } });

  await recordAudit({
    actorUserId: session.userId,
    chamberId: article.chamberId,
    action: "knowledge.deleted",
    target: article.id,
    metadata: { slug: article.slug, title: article.title },
  });

  revalidatePath(`/c/${parsed.chamberSlug}/knowledge`);
  revalidatePath(`/c/${parsed.chamberSlug}/admin/knowledge`);
  redirect(`/c/${parsed.chamberSlug}/admin/knowledge`);
}
