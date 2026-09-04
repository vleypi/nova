"use client";
import { useEffect, useState } from "react";
import { TPenTool, TShapeKind, TTool } from "../engine/types";
import { BoardEngine } from "../engine/BoardEngine";
import { STICKY_DEFAULT_COLOR } from "../constants/board.constant";

interface IUseBoardToolsResult {
  activeTool: TTool;
  setActiveTool: (tool: TTool) => void;
  activePenTool: TPenTool;
  setActivePenTool: (tool: TPenTool) => void;
  activeStickyColor: string;
  setActiveStickyColor: (color: string) => void;
  activeShapeKind: TShapeKind;
  setActiveShapeKind: (kind: TShapeKind) => void;
}

// Локальный UI-стейт инструментов: активный tool, активный pen-подтип,
// armed-цвет стикеров, armed-shape-kind. Сеттеры обновляют локальный стейт и проксируют в движок.
// activeToolChange-подписка нужна потому что ShapeTool автопереключается в select после создания.
export function useBoardTools(engine: BoardEngine | null): IUseBoardToolsResult {
  const [activeTool, setActiveToolState] = useState<TTool>("select");
  const [activePenTool, setActivePenToolState] = useState<TPenTool>("pencil");
  const [activeStickyColor, setActiveStickyColorState] = useState<string>(
    STICKY_DEFAULT_COLOR,
  );
  const [activeShapeKind, setActiveShapeKindState] = useState<TShapeKind>("rect");

  useEffect(() => {
    if (!engine) return;
    return engine.on("activeToolChange", setActiveToolState);
  }, [engine]);

  const setActiveTool = (tool: TTool) => {
    setActiveToolState(tool);
    engine?.setTool(tool);
  };

  const setActivePenTool = (tool: TPenTool) => {
    setActivePenToolState(tool);
    engine?.setPenTool(tool);
  };

  const setActiveStickyColor = (color: string) => {
    setActiveStickyColorState(color);
    engine?.setArmedColor(color);
  };

  const setActiveShapeKind = (kind: TShapeKind) => {
    setActiveShapeKindState(kind);
    engine?.setArmedShapeKind(kind);
  };

  return {
    activeTool,
    setActiveTool,
    activePenTool,
    setActivePenTool,
    activeStickyColor,
    setActiveStickyColor,
    activeShapeKind,
    setActiveShapeKind,
  };
}
