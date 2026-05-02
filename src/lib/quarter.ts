export type Quarter = { year: number; q: 1 | 2 | 3 | 4 };

export function currentQuarter(now = new Date()): Quarter {
  const month = now.getUTCMonth();
  const q = (Math.floor(month / 3) + 1) as Quarter["q"];
  return { year: now.getUTCFullYear(), q };
}

export function quarterRange({ year, q }: Quarter): { from: Date; to: Date } {
  const startMonth = (q - 1) * 3;
  return {
    from: new Date(Date.UTC(year, startMonth, 1)),
    to: new Date(Date.UTC(year, startMonth + 3, 1)),
  };
}

export function quarterLabel({ year, q }: Quarter): string {
  return `Q${q} ${year}`;
}

export function parseQuarterParam(raw: string | undefined): Quarter | null {
  if (!raw) return null;
  const match = /^(\d{4})-Q([1-4])$/.exec(raw.trim());
  if (!match) return null;
  return { year: Number(match[1]), q: Number(match[2]) as Quarter["q"] };
}

export function quarterParam({ year, q }: Quarter): string {
  return `${year}-Q${q}`;
}
