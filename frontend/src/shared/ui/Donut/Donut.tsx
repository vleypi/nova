"use client";

export interface IDonutSegment {
  value: number;
  color: string;
  label: string;
}

interface IDonutProps {
  segments: IDonutSegment[];
  size?: number;
  legend?: boolean;
}

const DONUT_RADIUS = 42;
const DONUT_STROKE_WIDTH = 12;

// Donut-chart с сегментами, total в центре и опциональной легендой.
export function Donut({ segments, size = 120, legend = true }: IDonutProps) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const circumference = 2 * Math.PI * DONUT_RADIUS;
  let offset = 0;

  return (
    <div className="flex items-center gap-5">
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className="flex-shrink-0 -rotate-90"
      >
        <circle
          cx="50"
          cy="50"
          r={DONUT_RADIUS}
          fill="none"
          stroke="#f3f4f6"
          strokeWidth={DONUT_STROKE_WIDTH}
        />
        {segments.map((segment, i) => {
          const fraction = total > 0 ? segment.value / total : 0;
          const dash = circumference * fraction;
          const gap = circumference - dash;
          const segmentOffset = offset;
          offset += dash;
          return (
            <circle
              key={i}
              cx="50"
              cy="50"
              r={DONUT_RADIUS}
              fill="none"
              stroke={segment.color}
              strokeWidth={DONUT_STROKE_WIDTH}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-segmentOffset}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          );
        })}
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dy="0.35em"
          className="rotate-90 origin-center"
          fill="#111827"
          fontSize="18"
          fontWeight="700"
        >
          {total}
        </text>
      </svg>

      {legend && (
        <div className="flex flex-col gap-1.5">
          {segments.map((segment, i) => (
            <div key={i} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: segment.color }}
              />
              <span className="text-xs text-gray-500">{segment.label}</span>
              <span className="text-xs font-semibold text-gray-700">
                {segment.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
