"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TConnectionStatus } from "../engine/types/ui.types";
import { BoardEngine } from "../engine/BoardEngine";

interface IUseBoardConnectionResult {
  connectionStatus: TConnectionStatus;
  boardError: string | null;
  boardReady: boolean;
}

// Подписывается на connectionStatus/boardError/boardReady и toast.
// Toast пробрасывается в sonner.error как side-effect.
export function useBoardConnection(
  engine: BoardEngine | null,
): IUseBoardConnectionResult {
  const [connectionStatus, setConnectionStatus] =
    useState<TConnectionStatus>("connected");
  const [boardError, setBoardError] = useState<string | null>(null);
  const [boardReady, setBoardReady] = useState(false);

  useEffect(() => {
    if (!engine) return;

    const unsubStatus = engine.on("connectionStatus", setConnectionStatus);
    const unsubError = engine.on("boardError", setBoardError);
    const unsubReady = engine.on("boardReady", () => setBoardReady(true));
    const unsubToast = engine.on("toast", (message) => toast.error(message));

    return () => {
      unsubStatus();
      unsubError();
      unsubReady();
      unsubToast();
    };
  }, [engine]);

  return { connectionStatus, boardError, boardReady };
}
