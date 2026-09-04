
export function fillMonthlyBuckets(
  rows: { bucket: Date | string; count: string | number }[],
  months: number,
): number[] {
  const now = new Date();
  const result = new Array(months).fill(0) as number[];
  const byKey = new Map<string, number>();
  for (const r of rows) {
    const d = typeof r.bucket === 'string' ? new Date(r.bucket) : r.bucket;
    byKey.set(`${d.getUTCFullYear()}-${d.getUTCMonth()}`, Number(r.count));
  }
  for (let i = 0; i < months; i++) {
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth() - (months - 1 - i), 1));
    result[i] = byKey.get(`${d.getUTCFullYear()}-${d.getUTCMonth()}`) ?? 0;
  }
  return result;
}


export function fillDailyBuckets(
  rows: { bucket: Date | string; count: string | number }[],
  days: number,
): { daily: number[]; total: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daily = new Array(days).fill(0) as number[];
  const byKey = new Map<string, number>();
  let total = 0;
  for (const r of rows) {
    const d = typeof r.bucket === 'string' ? new Date(r.bucket) : r.bucket;
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
    const c = Number(r.count);
    byKey.set(key, c);
    total += c;
  }
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1 - i));
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
    daily[i] = byKey.get(key) ?? 0;
  }
  return { daily, total };
}
