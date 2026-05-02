import type { Prisma } from "@prisma/client";

type TxClient = Prisma.TransactionClient;

export type EvaluateMotionResult = {
  status: "OPEN" | "PASSED" | "REJECTED" | "WITHDRAWN";
  closed: boolean;
  yes: number;
  no: number;
  abstain: number;
};

export async function evaluateMotion(
  motionId: string,
  tx: TxClient,
): Promise<EvaluateMotionResult> {
  const motion = await tx.motion.findUnique({
    where: { id: motionId },
    select: { id: true, status: true, quorum: true },
  });
  if (!motion) throw new Error("Motion not found");

  const grouped = await tx.vote.groupBy({
    by: ["choice"],
    where: { motionId },
    _count: { choice: true },
  });

  const tally = { YES: 0, NO: 0, ABSTAIN: 0 } as Record<"YES" | "NO" | "ABSTAIN", number>;
  for (const g of grouped) {
    tally[g.choice] = g._count.choice;
  }

  const total = tally.YES + tally.NO + tally.ABSTAIN;

  if (motion.status !== "OPEN" || total < motion.quorum) {
    return {
      status: motion.status,
      closed: false,
      yes: tally.YES,
      no: tally.NO,
      abstain: tally.ABSTAIN,
    };
  }

  const nextStatus = tally.YES > tally.NO ? "PASSED" : "REJECTED";
  await tx.motion.update({
    where: { id: motion.id },
    data: { status: nextStatus, closedAt: new Date() },
  });

  return {
    status: nextStatus,
    closed: true,
    yes: tally.YES,
    no: tally.NO,
    abstain: tally.ABSTAIN,
  };
}

export function defaultQuorum(boardSize: number): number {
  if (boardSize <= 0) return 1;
  return Math.ceil(boardSize / 2);
}
