import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { chamberRoleFor } from "@/lib/auth/permissions";

const inputSchema = z.object({
  chamberSlug: z.string().min(1),
  targetUserId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const parsed = inputSchema.safeParse({
    chamberSlug: formData.get("chamberSlug"),
    targetUserId: formData.get("targetUserId"),
  });
  if (!parsed.success) {
    return new NextResponse("Bad request", { status: 400 });
  }

  const session = await requireSession();
  const chamber = await prisma.chamber.findUnique({
    where: { slug: parsed.data.chamberSlug },
    select: { id: true },
  });
  if (!chamber) return new NextResponse("Chamber not found", { status: 404 });

  if (!chamberRoleFor(session, chamber.id)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const otherUserId = parsed.data.targetUserId;
  if (otherUserId === session.userId) {
    return NextResponse.redirect(new URL("/messages", request.url), 303);
  }

  const otherIsMember = await prisma.membership.findFirst({
    where: { chamberId: chamber.id, userId: otherUserId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!otherIsMember) return new NextResponse("Recipient not in chamber", { status: 403 });

  const existing = await prisma.conversation.findFirst({
    where: {
      chamberId: chamber.id,
      AND: [
        { participants: { some: { userId: session.userId } } },
        { participants: { some: { userId: otherUserId } } },
      ],
    },
    include: { _count: { select: { participants: true } } },
  });

  let conversationId = existing && existing._count.participants === 2 ? existing.id : null;

  if (!conversationId) {
    const created = await prisma.conversation.create({
      data: {
        chamberId: chamber.id,
        startedById: session.userId,
        participants: {
          createMany: {
            data: [{ userId: session.userId }, { userId: otherUserId }],
          },
        },
      },
      select: { id: true },
    });
    conversationId = created.id;
  }

  return NextResponse.redirect(
    new URL(`/messages/${conversationId}`, request.url),
    303,
  );
}
