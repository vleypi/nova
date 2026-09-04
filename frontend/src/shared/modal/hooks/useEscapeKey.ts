"use client";
import { useEffect } from "react";

// Слушает Escape на window и вызывает callback, пока enabled=true.
export function useEscapeKey(callback: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") callback();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enabled, callback]);
}
