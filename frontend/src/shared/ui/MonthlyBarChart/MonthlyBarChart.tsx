"use client";
import { getMonthLabels } from "@/shared/utils/chart.util";

interface IMonthlyBarChartProps {
  buckets: number[];
  barColor?: string;
}

const MIN_BAR_HEIGHT_NONZERO = 6;
const MIN_BAR_HEIGHT_ZERO = 2;
const MIN_OPACITY = 0.35;
const MAX_OPACITY_DELTA = 0.65;

// Месячный bar-chart с увеличивающейся opacity к свежим месяцам.
export function MonthlyBarChart({
  buckets,
  barColor = "bg-purple-500",
}: IMonthlyBarChartProps) {
  const max = Math.max(...buckets, 1);
  const labels = getMonthLabels(buckets.length);
  const lastIndex = Math.max(buckets.length - 1, 1);

  return (
    <>
      <div className="flex items-end gap-2 h-[90px]">
        {buckets.map((value, i) => {
          const height = Math.max(
            (value / max) * 100,
            value === 0 ? MIN_BAR_HEIGHT_ZERO : MIN_BAR_HEIGHT_NONZERO,
          );
          const opacity = MIN_OPACITY + (i / lastIndex) * MAX_OPACITY_DELTA;
          return (
            <div
              key={i}
              className={`flex-1 ${barColor} rounded transition-all duration-700 ease-out`}
              style={{ height: `${height}%`, opacity }}
              title={`${labels[i]}: ${value}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-2">
        {labels.map((label, i) => (
          <span key={i}>{label}</span>
        ))}
      </div>
    </>
  );
}
