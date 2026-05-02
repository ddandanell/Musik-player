import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { hasChamberRole } from "@/lib/auth/permissions";
import { recordAudit } from "@/lib/audit";
import { toCsv } from "@/lib/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ chamberSlug: string }> },
) {
  const { chamberSlug } = await params;
  const session = await requireSession();
  const chamber = await prisma.chamber.findUnique({
    where: { slug: chamberSlug },
    select: { id: true, name: true },
  });
  if (!chamber) return new NextResponse("Not found", { status: 404 });
  if (!hasChamberRole(session, chamber.id, "CHAMBER_ADMIN")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const members = await prisma.membership.findMany({
    where: { chamberId: chamber.id },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      tier: { select: { name: true } },
      company: { select: { name: true } },
    },
    orderBy: { joinedAt: "desc" },
  });

  const headers = [
    "name",
    "email",
    "phone",
    "company",
    "tier",
    "role",
    "status",
    "tags",
    "joined_at",
    "expires_at",
    "auto_renew",
  ];
  const rows = members.map((m) => [
    m.user.name ?? "",
    m.user.email,
    m.user.phone ?? "",
    m.company?.name ?? "",
    m.tier?.name ?? "",
    m.role,
    m.status,
    m.tags.join("|"),
    m.joinedAt,
    m.expiresAt,
    m.autoRenew,
  ]);

  await recordAudit({
    actorUserId: session.userId,
    chamberId: chamber.id,
    action: "export.members",
    metadata: { count: members.length },
  });

  const today = new Date().toISOString().slice(0, 10);
  const filename = `${chamberSlug}-members-${today}.csv`;

  return new NextResponse(toCsv(headers, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
