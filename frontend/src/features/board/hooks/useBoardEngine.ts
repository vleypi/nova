"use client";
import { RefObject, useEffect, useRef, useState } from "react";
import { ICamera } from "../engine/types";
import { BoardEngine } from "../engine/BoardEngine";

interface IUseBoardEngineOpts {
  containerRef: RefObject<HTMLDivElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  boardId: string | undefined;
  userId: string | undefined;
}

interface IUseBoardEngineResult {
  // Текущий движок. null до монтирования и между пересозданиями.
  engine: BoardEngine | null;
  // Ref-обёртка над engine.camera для компонентов, которым нужно читать
  // живые координаты без подписки.
  cameraRef: RefObject<ICamera>;
}

// Создаёт BoardEngine когда готовы canvas/container/boardId/userId.
// Уничтожает движок при размонтировании или смене boardId/userId.
export function useBoardEngine(
  opts: IUseBoardEngineOpts,
): IUseBoardEngineResult {
  const { containerRef, canvasRef, boardId, userId } = opts;
  const cameraRef = useRef<ICamera>({ x: 0, y: 0, zoom: 1 });
  const [engine, setEngine] = useState<BoardEngine | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !boardId || !userId) return;

    const created = new BoardEngine({ canvas, container, boardId, userId });
    cameraRef.current = created.camera;
    created.start();
    setEngine(created);

    return () => {
      created.destroy();
      cameraRef.current = { x: 0, y: 0, zoom: 1 };
      setEngine(null);
    };
  }, [containerRef, canvasRef, boardId, userId]);

  return { engine, cameraRef };
}
