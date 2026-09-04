"use client";
import type { TPenTool, TShapeKind, TTool } from "../../engine/types";
import { BoardLeftToolbar } from "./BoardLeftToolbar";
import { PenSubToolbar } from "./PenSubToolbar";
import { ShapeSubToolbar } from "./ShapeSubToolbar";
import { StickyColorBar } from "./StickyColorBar";

interface IBoardToolbarProps {
  activeTool: TTool;
  setActiveTool: (tool: TTool) => void;
  activePenTool: TPenTool;
  setActivePenTool: (tool: TPenTool) => void;
  activeStickyColor: string;
  setActiveStickyColor: (color: string) => void;
  activeShapeKind: TShapeKind;
  setActiveShapeKind: (kind: TShapeKind) => void;
  onAiClick: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

// Главный тулбар доски: основная панель инструментов слева плюс
// нужный саб-тулбар (pen/sticky/shape) под текущий activeTool. Скрывает
// от страницы условный рендер и проброс tool-state.
export function BoardToolbar({
  activeTool,
  setActiveTool,
  activePenTool,
  setActivePenTool,
  activeStickyColor,
  setActiveStickyColor,
  activeShapeKind,
  setActiveShapeKind,
  onAiClick,
  onUndo,
  onRedo,
}: IBoardToolbarProps) {
  return (
    <>
      <BoardLeftToolbar
        activeTool={activeTool}
        activeShapeKind={activeShapeKind}
        onToolChange={setActiveTool}
        onAiClick={onAiClick}
        onUndo={onUndo}
        onRedo={onRedo}
      />
      {activeTool === "pen" && (
        <PenSubToolbar
          activePenTool={activePenTool}
          onPenToolChange={setActivePenTool}
        />
      )}
      {activeTool === "sticky" && (
        <StickyColorBar
          activeColor={activeStickyColor}
          onColorChange={setActiveStickyColor}
        />
      )}
      {activeTool === "shape" && (
        <ShapeSubToolbar
          activeShapeKind={activeShapeKind}
          onShapeKindChange={setActiveShapeKind}
        />
      )}
    </>
  );
}
