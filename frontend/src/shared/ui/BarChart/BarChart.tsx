"use client";

export interface IBarChartItem {
  label: string;
  value: number;
  sublabel?: string;
}

interface IBarChartProps {
  data: IBarChartItem[];
  barColor?: string;
  max?: number;
  format?: (value: number) => string;
  emptyMessage?: string;
}

const MIN_BAR_PERCENT = 2;

// Горизонтальный bar-chart с label слева и значением справа.
export function BarChart({
  data,
  barColor = "bg-nova-blue",
  max,
  format = (value) => value.toString(),
  emptyMessage = "Нет данных",
}: IBarChartProps) {
  if (!data.length) {
    return (
      <p className="text-xs text-gray-400 text-center py-4">{emptyMessage}</p>
    );
  }

  const effectiveMax = max ?? Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="flex flex-col gap-2">
      {data.map((item, i) => {
        const percent = Math.max(
          MIN_BAR_PERCENT,
          Math.round((item.value / effectiveMax) * 100),
        );
        return (
          <div key={i} className="flex items-center gap-3">
            <div className="w-20 flex-shrink-0">
              <p className="text-xs text-gray-700 truncate">{item.label}</p>
              {item.sublabel && (
                <p className="text-[10px] text-gray-400 truncate">
                  {item.sublabel}
                </p>
              )}
            </div>
            <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
              <div
                className={`h-full ${barColor} rounded transition-all duration-700 ease-out`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-700 w-8 text-right flex-shrink-0">
              {format(item.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
