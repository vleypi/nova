"use client";

export type TStatCardColor =
  | "blue"
  | "green"
  | "red"
  | "amber"
  | "purple"
  | "cyan";

interface IStatCardProps {
  label: string;
  value: number | string;
  icon: string;
  color?: TStatCardColor;
}

const COLOR_MAP: Record<
  TStatCardColor,
  { bg: string; text: string; icon: string }
> = {
  blue: { bg: "bg-blue-50", text: "text-blue-600", icon: "text-blue-500" },
  green: { bg: "bg-green-50", text: "text-green-600", icon: "text-green-500" },
  red: { bg: "bg-red-50", text: "text-red-600", icon: "text-red-500" },
  amber: { bg: "bg-amber-50", text: "text-amber-600", icon: "text-amber-500" },
  purple: {
    bg: "bg-purple-50",
    text: "text-purple-600",
    icon: "text-purple-500",
  },
  cyan: { bg: "bg-cyan-50", text: "text-cyan-600", icon: "text-cyan-500" },
};

// Карточка-метрика с цветной иконкой слева и label/value справа.
export function StatCard({
  label,
  value,
  icon,
  color = "blue",
}: IStatCardProps) {
  const styles = COLOR_MAP[color];

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 flex items-center gap-4">
      <div
        className={`w-11 h-11 ${styles.bg} rounded-xl flex items-center justify-center flex-shrink-0`}
      >
        <svg
          className={`w-5 h-5 ${styles.icon}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={icon}
          />
        </svg>
      </div>
      <div>
        <p className={`text-2xl font-bold ${styles.text}`}>{value}</p>
        <p className="text-xs text-gray-400 mt-0.5">{label}</p>
      </div>
    </div>
  );
}
