"use client";
import { TShapeKind } from "@/features/board/engine/types";
import {
  RectIcon,
  EllipseIcon,
  DiamondIcon,
  TriangleIcon,
} from "./icons/ShapeIcons";

interface ISubToolButtonProps {
  kind: TShapeKind;
  activeShapeKind: TShapeKind;
  title: string;
  onClick: (kind: TShapeKind) => void;
  children: React.ReactNode;
}
function SubToolButton({
  kind,
  activeShapeKind,
  title,
  onClick,
  children,
}: ISubToolButtonProps) {
  const isActive = kind === activeShapeKind;
  return (
    <button
      title={title}
      onClick={() => onClick(kind)}
      className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
        isActive
          ? "bg-blue-50 text-[#4262ff]"
          : "text-gray-800 hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}

interface IShapeSubToolbarProps {
  activeShapeKind: TShapeKind;
  onShapeKindChange: (kind: TShapeKind) => void;
}
export function ShapeSubToolbar({
  activeShapeKind,
  onShapeKindChange,
}: IShapeSubToolbarProps) {
  return (
    <div className="absolute left-[4.5rem] top-1/2 -translate-y-1/2 z-50 bg-white rounded-lg shadow-md flex flex-col items-center gap-1 py-2 px-1.5">
      <SubToolButton
        kind="rect"
        activeShapeKind={activeShapeKind}
        title="Прямоугольник"
        onClick={onShapeKindChange}
      >
        <RectIcon />
      </SubToolButton>
      <SubToolButton
        kind="ellipse"
        activeShapeKind={activeShapeKind}
        title="Эллипс"
        onClick={onShapeKindChange}
      >
        <EllipseIcon />
      </SubToolButton>
      <SubToolButton
        kind="diamond"
        activeShapeKind={activeShapeKind}
        title="Ромб"
        onClick={onShapeKindChange}
      >
        <DiamondIcon />
      </SubToolButton>
      <SubToolButton
        kind="triangle"
        activeShapeKind={activeShapeKind}
        title="Треугольник"
        onClick={onShapeKindChange}
      >
        <TriangleIcon />
      </SubToolButton>
    </div>
  );
}
