import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export type AuditInput = {
  actorUserId: string;
  action: string;
  chamberId?: string | null;
  target?: string | null;
  metadata?: Prisma.InputJsonValue;
};

// Records an admin action. Best-effort: never let a logging failure block
// the underlying operation, but surface it in server logs.
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditEntry.create({
      data: {
        actorUserId: input.actorUserId,
        action: input.action,
        chamberId: input.chamberId ?? null,
        target: input.target ?? null,
        metadata: input.metadata,
      },
    });
  } catch (error) {
    console.error("[audit] failed to record entry", error);
  }
}
