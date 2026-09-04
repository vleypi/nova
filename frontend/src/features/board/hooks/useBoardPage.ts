"use client";
import { useRef } from "react";
import { useParams } from "next/navigation";
import { useMe } from "@/shared/identity";
import { useBoardEngine } from "./useBoardEngine";
import { useBoardTools } from "./useBoardTools";
import { useBoardCollaborators } from "./useBoardCollaborators";
import { useBoardConnection } from "./useBoardConnection";
import { useBoardZoom } from "./useBoardZoom";
import { useBoardSelection } from "./useBoardSelection";

// Re-export ICursorData чтобы потребители продолжали тянуть из @/features/board.
export type { ICursorData } from "./useBoardCollaborators";

// Главный hook страницы доски. Композирует subhook-и по областям ответственности
// (engine lifecycle, tools, collaborators, connection, zoom, selection) и
// возвращает плоский объект, который Page деструктурирует и раздаёт виджетам.
export function useBoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const { data: me } = useMe();

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { engine, cameraRef } = useBoardEngine({
    containerRef,
    canvasRef,
    boardId,
    userId: me?.id,
  });

  const tools = useBoardTools(engine);
  const collaborators = useBoardCollaborators(engine);
  const connection = useBoardConnection(engine);
  const zoom = useBoardZoom(engine);
  const selection = useBoardSelection(engine);

  return {
    boardId,
    containerRef,
    canvasRef,
    cameraRef,
    engine,
    ...tools,
    ...collaborators,
    ...connection,
    ...zoom,
    ...selection,
    onUndo: () => engine?.undo(),
    onRedo: () => engine?.redo(),
  };
}
