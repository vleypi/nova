"use client";
import Link from "next/link";
import type { ReactNode } from "react";

interface ISparklineStatCardProps {
  label: string;
  value: number | string;
  color: string;
  points: number[];
  href?: string;
  onNavigate?: () => void;
  aside?: ReactNode;
}

// Карточка-метрика с label, value и sparkline-полилинией снизу.
export function SparklineStatCard({
  label,
  value,
  color,
  points,
  href,
  onNavigate,
  aside,
}: ISparklineStatCardProps) {
  const max = Math.max(...points, 1);
  const lastIndex = Math.max(points.length - 1, 1);

  const linePoints = points
    .map(
      (pointValue, i) =>
        `${(i / lastIndex) * 100},${30 - (pointValue / max) * 27}`,
    )
    .join(" ");
  const fillPoints = `0,30 ${linePoints} 100,30`;

  const body = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">{label}</p>
        {aside ??
          (href && (
            <i className="fas fa-arrow-right text-[10px] text-gray-300 group-hover:text-gray-500 transition-colors" />
          ))}
      </div>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      <svg
        className="w-full h-8 mt-3"
        viewBox="0 0 100 30"
        preserveAspectRatio="none"
      >
        <polyline
          points={linePoints}
          fill="none"
          stroke={color}
          strokeWidth="2"
        />
        <polyline points={fillPoints} fill={color} opacity="0.1" />
      </svg>
    </>
  );

  const baseClass = "bg-white border border-gray-100 rounded-xl p-5";

  if (href) {
    return (
      <Link
        href={href}
        onClick={onNavigate}
        className={`group ${baseClass} hover:border-gray-200 hover:bg-gray-50/50 transition-colors cursor-pointer`}
      >
        {body}
      </Link>
    );
  }
  return <div className={baseClass}>{body}</div>;
}
