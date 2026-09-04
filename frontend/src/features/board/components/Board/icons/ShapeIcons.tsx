"use client";

// Иконки фигур: единый outline-стиль (currentColor stroke, fill none, одинаковая
// толщина и viewBox). Используются в ShapeSubToolbar и shape-kind switcher
// TextFormatToolbar - один источник правды.

const ICON_CLASS = "w-6 h-6";
const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.25,
  strokeLinejoin: "round",
  strokeLinecap: "round",
} as const;

export function RectIcon() {
  return (
    <svg className={ICON_CLASS} {...ICON_PROPS}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}

export function EllipseIcon() {
  return (
    <svg className={ICON_CLASS} {...ICON_PROPS}>
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
}

export function DiamondIcon() {
  return (
    <svg className={ICON_CLASS} {...ICON_PROPS}>
      <path d="M12 3 L20 12 L12 21 L4 12 Z" />
    </svg>
  );
}

export function TriangleIcon() {
  return (
    <svg className={ICON_CLASS} {...ICON_PROPS}>
      <path d="M12 5 L20 19 L4 19 Z" />
    </svg>
  );
}
