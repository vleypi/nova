"use client";
import { useEffect, useState } from "react";
import { ISelectionBox } from "../engine/types";
import { BoardEngine } from "../engine/BoardEngine";

interface IUseBoardSelectionResult {
  selectionBox: ISelectionBox | null;
}

// Подписывается на selectionBoxChange — текущая рамка drag-rect.
// null когда выделение не растягивается.
export function useBoardSelection(
  engine: BoardEngine | null,
): IUseBoardSelectionResult {
  const [selectionBox, setSelectionBox] = useState<ISelectionBox | null>(null);

  useEffect(() => {
    if (!engine) return;
    return engine.on("selectionBoxChange", setSelectionBox);
  }, [engine]);

  return { selectionBox };
}
