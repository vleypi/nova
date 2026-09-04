"use client";
import { useEffect, useState } from "react";
import { BoardEngine } from "../engine/BoardEngine";

interface IUseBoardZoomResult {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

// Подписывается на zoomChange. Возвращает текущий зум и кнопочные хендлеры.
export function useBoardZoom(engine: BoardEngine | null): IUseBoardZoomResult {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!engine) return;
    return engine.on("zoomChange", setZoom);
  }, [engine]);

  return {
    zoom,
    onZoomIn: () => engine?.zoomIn(),
    onZoomOut: () => engine?.zoomOut(),
  };
}
