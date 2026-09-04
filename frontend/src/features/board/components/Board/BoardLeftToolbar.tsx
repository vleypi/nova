"use client";
import { useEffect } from "react";
import { TShapeKind, TTool } from "@/features/board/engine/types";
import { HistoryWidget } from "./HistoryWidget";
import {
  RectIcon,
  EllipseIcon,
  DiamondIcon,
  TriangleIcon,
} from "./icons/ShapeIcons";

function AiIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z" />
      <path d="M5 5l1.5 3L5 11 3.5 8 5 5z" opacity="0.6" />
      <path d="M19 13l1.5 3-1.5 3-1.5-3L19 13z" opacity="0.6" />
    </svg>
  );
}
function SelectIcon() {
  return <i className="fas fa-arrow-pointer text-lg leading-none" />;
}
function PenIcon() {
  return <i className="fas fa-pen text-lg leading-none" />;
}
function TextIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 4h14v4h-2V6H13v12h2v2H9v-2h2V6H5.5v2H4V4z" />
    </svg>
  );
}
function StickyIcon() {
  return <i className="fas fa-note-sticky text-lg leading-none" />;
}
// Иконка фигуры на главной кнопке отражает выбранный shapeKind (по умолчанию rect).
function ShapeIcon({ kind }: { kind: TShapeKind }) {
  switch (kind) {
    case "rect":
      return <RectIcon />;
    case "ellipse":
      return <EllipseIcon />;
    case "diamond":
      return <DiamondIcon />;
    case "triangle":
      return <TriangleIcon />;
  }
}

interface IToolButtonProps {
  tool: TTool;
  activeTool: TTool;
  title: string;
  onClick: (tool: TTool) => void;
  children: React.ReactNode;
}
function ToolButton({
  tool,
  activeTool,
  title,
  onClick,
  children,
}: IToolButtonProps) {
  const isActive = tool === activeTool;
  return (
    <button
      title={title}
      onClick={() => onClick(tool)}
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

interface IBoardLeftToolbarProps {
  activeTool: TTool;
  activeShapeKind: TShapeKind;
  onToolChange: (tool: TTool) => void;
  onAiClick: () => void;
  onUndo: () => void;
  onRedo: () => void;
}
export function BoardLeftToolbar({
  activeTool,
  activeShapeKind,
  onToolChange,
  onAiClick,
  onUndo,
  onRedo,
}: IBoardLeftToolbarProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null;
      if (!tgt) return;
      if (
        tgt.tagName === "INPUT" ||
        tgt.tagName === "TEXTAREA" ||
        tgt.isContentEditable
      )
        return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        onToolChange("sticky");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onToolChange]);

  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-2">
      <button
        title="Nova AI"
        onClick={onAiClick}
        className="w-[52px] h-[52px] flex items-center justify-center rounded-full bg-gradient-to-br from-[#4262ff] via-[#9d6cff] to-[#ff79d1] shadow-md text-white hover:opacity-90 transition-opacity"
      >
        <AiIcon />
      </button>

      <div className="bg-white rounded-lg shadow-md flex flex-col items-center gap-1 py-2 px-1.5">
        <ToolButton
          tool="select"
          activeTool={activeTool}
          title="Выбрать"
          onClick={onToolChange}
        >
          <SelectIcon />
        </ToolButton>
        <ToolButton
          tool="pen"
          activeTool={activeTool}
          title="Ручка"
          onClick={onToolChange}
        >
          <PenIcon />
        </ToolButton>
        <ToolButton
          tool="text"
          activeTool={activeTool}
          title="Текст"
          onClick={onToolChange}
        >
          <TextIcon />
        </ToolButton>
        <ToolButton
          tool="sticky"
          activeTool={activeTool}
          title="Sticky note · N"
          onClick={onToolChange}
        >
          <StickyIcon />
        </ToolButton>
        <ToolButton
          tool="shape"
          activeTool={activeTool}
          title="Фигуры"
          onClick={onToolChange}
        >
          <ShapeIcon kind={activeShapeKind} />
        </ToolButton>
      </div>

      <HistoryWidget onUndo={onUndo} onRedo={onRedo} />
    </div>
  );
}
