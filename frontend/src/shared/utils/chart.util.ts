export const DAY_MS = 24 * 60 * 60 * 1000;

const MONTH_NAMES = [
  "Янв",
  "Фев",
  "Мар",
  "Апр",
  "Май",
  "Июн",
  "Июл",
  "Авг",
  "Сен",
  "Окт",
  "Ноя",
  "Дек",
];

const WEEK_DAYS = 7;

// Распределение дат по месячным buckets с конца окна назад.
export function buildMonthlyBuckets(dates: string[], months: number): number[] {
  const now = new Date();
  const buckets = new Array(months).fill(0) as number[];
  for (const dateString of dates) {
    const date = new Date(dateString);
    const monthsAgo =
      (now.getFullYear() - date.getFullYear()) * 12 +
      (now.getMonth() - date.getMonth());
    if (monthsAgo >= 0 && monthsAgo < months) {
      buckets[months - 1 - monthsAgo]++;
    }
  }
  return buckets;
}

// Накопительная сумма по месяцам с учётом дат до начала окна.
export function buildCumulativeMonthly(
  dates: string[],
  months: number,
): number[] {
  const now = new Date();
  const windowStart = new Date(
    now.getFullYear(),
    now.getMonth() - (months - 1),
    1,
  ).getTime();
  let running = dates.filter(
    (dateString) => new Date(dateString).getTime() < windowStart,
  ).length;
  return buildMonthlyBuckets(dates, months).map(
    (count) => (running += count),
  );
}

// Распределение дат по недельным buckets с конца окна назад.
export function buildWeeklyBuckets(dates: string[], weeks: number): number[] {
  const WEEK_MS = WEEK_DAYS * DAY_MS;
  const now = Date.now();
  const buckets = new Array(weeks).fill(0) as number[];
  for (const dateString of dates) {
    const weeksAgo = Math.floor((now - new Date(dateString).getTime()) / WEEK_MS);
    if (weeksAgo >= 0 && weeksAgo < weeks) {
      buckets[weeks - 1 - weeksAgo]++;
    }
  }
  return buckets;
}

// Сетка weeks × 7 дней для heatmap-визуализации активности.
export function buildHeatmap(dates: string[], weeks: number): number[][] {
  const grid: number[][] = Array.from({ length: weeks }, () =>
    new Array(WEEK_DAYS).fill(0),
  );
  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const totalDays = weeks * WEEK_DAYS;
  for (const dateString of dates) {
    const date = new Date(dateString);
    const dayMidnight = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    ).getTime();
    const daysAgo = Math.floor((today - dayMidnight) / DAY_MS);
    if (daysAgo < 0 || daysAgo >= totalDays) continue;
    const slotIndex = totalDays - 1 - daysAgo;
    grid[Math.floor(slotIndex / WEEK_DAYS)][slotIndex % WEEK_DAYS]++;
  }
  return grid;
}

// Список ru-кратких имён последних N месяцев в хронологическом порядке.
export function getMonthLabels(count: number): string[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const month = new Date(
      now.getFullYear(),
      now.getMonth() - (count - 1 - i),
      1,
    );
    return MONTH_NAMES[month.getMonth()];
  });
}
