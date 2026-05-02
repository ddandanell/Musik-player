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

const createSchema = z.object({
  chamberSlug: z.string().min(1),
  title: z.string().min(3).max(160),
  slug: z.string().optional(),
  description: z.string().min(10),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  location: z.string().optional(),
  capacity: z.string().optional(),
  visibility: z.enum(["PUBLIC", "MEMBERS_ONLY", "TIER_RESTRICTED", "BOARD_ONLY"]),
  ticketPrice: z.string().min(1),
});

export async function createEvent(formData: FormData): Promise<void> {
  const parsed = createSchema.parse({
    chamberSlug: formData.get("chamberSlug"),
    title: formData.get("title"),
    slug: formData.get("slug") || undefined,
    description: formData.get("description"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    location: formData.get("location") || undefined,
    capacity: formData.get("capacity") || undefined,
    visibility: formData.get("visibility"),
    ticketPrice: formData.get("ticketPrice"),
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

  const startsAt = new Date(parsed.startsAt);
  const endsAt = new Date(parsed.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    throw new Error("Invalid date");
  }
  if (endsAt < startsAt) throw new Error("endsAt must be after startsAt");

  const baseSlug = slugify(parsed.slug || parsed.title);
  if (!baseSlug) throw new Error("Slug cannot be empty");

  let candidate = baseSlug;
  let suffix = 1;
  while (
    await prisma.event.findUnique({
      where: { chamberId_slug: { chamberId: chamber.id, slug: candidate } },
      select: { id: true },
    })
  ) {
    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }

  const capacity = parsed.capacity ? Number(parsed.capacity) : null;
  const ticketPrice = Number(parsed.ticketPrice);
  if (Number.isNaN(ticketPrice) || ticketPrice < 0) {
    throw new Error("Invalid ticket price");
  }

  const event = await prisma.event.create({
    data: {
      chamberId: chamber.id,
      slug: candidate,
      title: parsed.title,
      description: parsed.description,
      startsAt,
      endsAt,
      location: parsed.location ?? null,
      capacity: capacity ?? null,
      visibility: parsed.visibility,
      status: "DRAFT",
      createdById: session.userId,
      ticketTypes: {
        create: {
          name: "Standard",
          price: ticketPrice,
          capacity: capacity ?? null,
        },
      },
    },
  });

  await recordAudit({
    actorUserId: session.userId,
    chamberId: chamber.id,
    action: "event.created",
    target: event.id,
    metadata: { title: event.title, slug: event.slug },
  });

  revalidatePath(`/c/${parsed.chamberSlug}/admin/events`);
  redirect(`/c/${parsed.chamberSlug}/admin/events/${event.id}`);
}
