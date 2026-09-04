"use client";
import { TConnectionStatus } from "@/features/board/engine/types/ui.types";
interface Props {
  status: TConnectionStatus;
}
export function ConnectionStatusWidget({ status }: Props) {
  if (status === "connected") return null;
  const message =
    status === "reconnecting"
      ? "Переподключение к серверу..."
      : "Не удалось подключиться к серверу";
  return (
    <>
      <div className="absolute inset-0 z-40" style={{ pointerEvents: "all" }} />

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl bg-black px-5 py-3 shadow-lg">
        {status === "reconnecting" && (
          <span className="block h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin flex-shrink-0" />
        )}
        {status === "failed" && (
          <span className="block h-4 w-4 rounded-full bg-red-400 flex-shrink-0" />
        )}
        <span className="text-sm font-medium text-white whitespace-nowrap">
          {message}
        </span>
      </div>
    </>
  );
}
