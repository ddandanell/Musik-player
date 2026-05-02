import type { ChamberRole, PlatformRole } from "@prisma/client";
import type { SessionContext } from "./session";

// Spec §2 — strict role hierarchy. Higher tiers inherit lower-tier abilities
// inside the same chamber. Cross-chamber access is denied.
const CHAMBER_ROLE_RANK: Record<ChamberRole, number> = {
  CHAMBER_ADMIN: 5,
  BOARD_MEMBER: 4,
  CORPORATE_CONTACT: 3,
  BUSINESS_MEMBER: 2,
  PUBLIC: 1,
};

export function isPlatformOperator(session: SessionContext | null): boolean {
  return session?.platformRole === "OPERATOR";
}

export function chamberRoleFor(
  session: SessionContext | null,
  chamberId: string,
): ChamberRole | null {
  if (!session) return null;
  if (isPlatformOperator(session)) return "CHAMBER_ADMIN";
  return session.memberships.find((m) => m.chamberId === chamberId)?.role ?? null;
}

export function hasChamberRole(
  session: SessionContext | null,
  chamberId: string,
  minimum: ChamberRole,
): boolean {
  const actual = chamberRoleFor(session, chamberId);
  if (!actual) return false;
  return CHAMBER_ROLE_RANK[actual] >= CHAMBER_ROLE_RANK[minimum];
}

export function assertChamberRole(
  session: SessionContext | null,
  chamberId: string,
  minimum: ChamberRole,
): void {
  if (!hasChamberRole(session, chamberId, minimum)) {
    throw new Error("FORBIDDEN");
  }
}

export function assertPlatformOperator(session: SessionContext | null): void {
  if (!isPlatformOperator(session)) {
    throw new Error("FORBIDDEN");
  }
}
