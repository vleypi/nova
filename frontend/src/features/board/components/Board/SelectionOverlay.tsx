import { ISelectionBox } from "@/features/board/engine/types";
interface ISelectionOverlayProps {
  box: ISelectionBox | null;
}
export function SelectionOverlay({ box }: ISelectionOverlayProps) {
  if (!box || box.width <= 2 || box.height <= 2) return null;
  return (
    <div
      className="absolute pointer-events-none rounded-sm"
      style={{
        left: box.x,
        top: box.y,
        width: box.width,
        height: box.height,
        backgroundColor: "rgba(66, 98, 255, 0.08)",
        border: "1.5px solid rgba(66, 98, 255, 0.4)",
      }}
    />
  );
}
