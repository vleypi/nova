"use client";
import { useEffect, useReducer, useState } from "react";
import type { BoardEngine } from "@/features/board/engine/BoardEngine";
import { MAX_SLOT_ELEMENTS } from "@/features/board/constants/board.constant";

interface ISelectionBoxState {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  count: number;
}

interface ISelectionToolbarProps {
  engine: BoardEngine;
  // Открывает чат сверху. Если уже открыт — no-op (page.tsx сам решает).
  onOpenAiChat: () => void;
}

const MAX_SLOTS_IN_CHAT = 10;
const TOOLBAR_HALF_WIDTH = 44;
const TOOLBAR_HEIGHT = 36;
const TOOLBAR_GAP = 8;

export function SelectionToolbar({
  engine,
  onOpenAiChat,
}: ISelectionToolbarProps) {
  const [box, setBox] = useState<ISelectionBoxState | null>(null);
  const [tool, setTool] = useState<string>(engine.getActiveTool());
  const [textEditing, setTextEditing] = useState(false);
  const [slotsCount, setSlotsCount] = useState(0);
  const [drawingRect, setDrawingRect] = useState(false);
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    const recomputeBox = (): void => {
      setBox(engine.getSelectionWorldBbox());
    };

    const unsubs: Array<() => void> = [];

    unsubs.push(engine.on("selectionChange", recomputeBox));
    unsubs.push(engine.on("activeToolChange", (t) => setTool(t)));
    unsubs.push(
      engine.on("textEditingChange", ({ editing }) => setTextEditing(editing)),
    );
    unsubs.push(
      engine.on("aiSlotsCountChange", ({ count }) => setSlotsCount(count)),
    );
    unsubs.push(
      engine.on("selectionBoxChange", (b) => setDrawingRect(b !== null)),
    );

    // Pan/zoom: пересчитываем экранные координаты overlay при изменении камеры.
    unsubs.push(engine.camera.subscribe(() => forceUpdate()));

    // Mount: читаем текущее выделение.
    recomputeBox();

    return () => {
      for (const u of unsubs) u();
    };
  }, [engine]);

  if (!box) return null;
  if (tool !== "select") return null;
  if (textEditing) return null;
  if (drawingRect) return null;

  const cam = engine.camera;
  const sx = box.minX * cam.zoom + cam.x;
  const sy = box.minY * cam.zoom + cam.y;
  const sw = (box.maxX - box.minX) * cam.zoom;
  const sh = (box.maxY - box.minY) * cam.zoom;

  let top = sy - (TOOLBAR_HEIGHT + TOOLBAR_GAP);
  const left = sx + sw / 2 - TOOLBAR_HALF_WIDTH;

  // Если сверху не помещается — позиционируем под bbox.
  if (top < 8) top = sy + sh + TOOLBAR_GAP;

  // Если ушло за низ viewport — скрываем.
  if (typeof window !== "undefined" && top > window.innerHeight - 8) {
    return null;
  }

  const aiDisabled =
    box.count > MAX_SLOT_ELEMENTS || slotsCount >= MAX_SLOTS_IN_CHAT;
  const aiTooltip =
    box.count > MAX_SLOT_ELEMENTS
      ? `Слишком большая группа (${box.count}/${MAX_SLOT_ELEMENTS}). Выделите меньше.`
      : slotsCount >= MAX_SLOTS_IN_CHAT
        ? `В чате уже ${MAX_SLOTS_IN_CHAT} слотов (максимум). Удалите один.`
        : "Прикрепить к AI";

  const handleAiClick = (): void => {
    if (aiDisabled) return;
    engine.attachSelectionAsSlot();
    onOpenAiChat();
  };

  const handleDeleteClick = (): void => {
    engine.deleteSelected();
  };

  return (
    <div
      className="fixed z-[55] flex items-center gap-1 rounded-xl bg-white shadow-lg border border-gray-200 px-1.5 py-1"
      style={{ top, left }}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        title={aiTooltip}
        disabled={aiDisabled}
        onClick={handleAiClick}
        className={`h-7 px-2 flex items-center gap-1 rounded-lg text-xs font-medium transition-colors ${
          aiDisabled
            ? "text-gray-400 cursor-not-allowed"
            : "text-[#5b2cb8] hover:bg-[#9d6cff]/10"
        }`}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z" />
        </svg>
        <span>AI</span>
      </button>

      <div className="w-px h-5 bg-gray-200" />

      <button
        type="button"
        title="Удалить выделенное"
        onClick={handleDeleteClick}
        className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
      >
        <svg
          className="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
        </svg>
      </button>
    </div>
  );
}
