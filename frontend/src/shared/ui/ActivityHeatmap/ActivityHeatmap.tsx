"use client";

interface IActivityHeatmapProps {
  weeks: number[][];
  title?: string;
  subtitle?: string;
  emptyMessage?: string;
}

const COLOR_CLASSES = [
  "bg-gray-100",
  "bg-blue-200",
  "bg-blue-400",
  "bg-blue-600",
  "bg-blue-800",
];

// Heatmap-сетка weeks × 7 дней с пятиуровневой градацией интенсивности.
export function ActivityHeatmap({
  weeks,
  title = "Активность",
  subtitle,
  emptyMessage = "Нет активности",
}: IActivityHeatmapProps) {
  const allValues = weeks.flat();
  const max = Math.max(...allValues, 1);
  const total = allValues.reduce((sum, value) => sum + value, 0);

  const level = (value: number): number => {
    if (value === 0) return 0;
    const fraction = value / max;
    if (fraction < 0.25) return 1;
    if (fraction < 0.5) return 2;
    if (fraction < 0.75) return 3;
    return 4;
  };

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-400">
          <span>меньше</span>
          <div className="flex gap-1">
            {COLOR_CLASSES.map((colorClass) => (
              <div
                key={colorClass}
                className={`w-3 h-3 rounded-sm ${colorClass}`}
              />
            ))}
          </div>
          <span>больше</span>
        </div>
      </div>
      {total === 0 ? (
        <p className="text-xs text-gray-400 text-center py-8">{emptyMessage}</p>
      ) : (
        <div className="flex gap-1 overflow-x-auto">
          {weeks.map((week, weekIndex) => (
            <div
              key={weekIndex}
              className="flex flex-col gap-1 flex-shrink-0"
            >
              {week.map((value, dayIndex) => (
                <div
                  key={dayIndex}
                  className={`w-3 h-3 rounded-sm ${COLOR_CLASSES[level(value)]}`}
                  title={value > 0 ? `${value} действ.` : "Нет активности"}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
