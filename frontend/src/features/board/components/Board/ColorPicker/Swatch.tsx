"use client";
import type { CSSProperties, ReactNode } from "react";
import { TRANSPARENT_CHECKER_BG } from "./constants";

interface ISwatchProps {
  // null - пустой слот (серый фон); "transparent" - шахматка; иначе сплошной цвет.
  color: string | null;
  active?: boolean;
  onClick?: () => void;
  title?: string;
  children?: ReactNode;
}

// Базовый свотч пикера: квадрат 28px со скруглёнными углами и единым стилем
// рамки. Active - синее кольцо с offset, idle - тонкое серое с hover-усилением.
// Если onClick не передан - cursor:default (пустой/disabled-слот).
export function Swatch({
  color,
  active = false,
  onClick,
  title,
  children,
}: ISwatchProps) {
  const isTransparent = color === "transparent";
  const isEmpty = color === null;
  const ringClass = active
    ? "ring-2 ring-[#4262ff] ring-offset-1"
    : onClick
      ? "ring-1 ring-gray-300 hover:ring-gray-400"
      : "ring-1 ring-gray-200";
  const cursorClass = onClick ? "cursor-pointer" : "cursor-default";
  const bgStyle: CSSProperties = isEmpty
    ? { backgroundColor: "#f3f4f6" }
    : isTransparent
      ? { backgroundColor: "#fff", ...TRANSPARENT_CHECKER_BG }
      : { backgroundColor: color };

  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`w-7 h-7 rounded-md flex items-center justify-center p-0 transition-all ${ringClass} ${cursorClass}`}
      style={bgStyle}
    >
      {children}
    </button>
  );
}
