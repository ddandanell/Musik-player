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
    select: { id: true },
  });
  if (!chamber) return new NextResponse("Not found", { status: 404 });
  if (!hasChamberRole(session, chamber.id, "CHAMBER_ADMIN")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const invoices = await prisma.invoice.findMany({
    where: { chamberId: chamber.id },
    orderBy: { issuedAt: "desc" },
  });

  const headers = [
    "number",
    "payer_email",
    "amount",
    "currency",
    "status",
    "description",
    "external_ref",
    "issued_at",
    "paid_at",
  ];
  const rows = invoices.map((i) => [
    i.number,
    i.payerEmail,
    i.amount.toString(),
    i.currency,
    i.status,
    i.description ?? "",
    i.externalRef ?? "",
    i.issuedAt,
    i.paidAt,
  ]);

  await recordAudit({
    actorUserId: session.userId,
    chamberId: chamber.id,
    action: "export.invoices",
    metadata: { count: invoices.length },
  });

  const today = new Date().toISOString().slice(0, 10);
  const filename = `${chamberSlug}-invoices-${today}.csv`;

  return new NextResponse(toCsv(headers, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
