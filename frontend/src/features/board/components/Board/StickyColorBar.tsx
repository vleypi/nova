"use client";
import { STICKY_PALETTE } from "@/features/board/constants/board.constant";

interface ISwatchButtonProps {
  color: string;
  active: boolean;
  onClick: (color: string) => void;
}
function SwatchButton({ color, active, onClick }: ISwatchButtonProps) {
  return (
    <button
      type="button"
      title={color}
      onClick={() => onClick(color)}
      className={`w-7 h-7 rounded-md transition-all ${
        active
          ? "ring-2 ring-[#4262ff] ring-offset-1"
          : "ring-1 ring-gray-300 hover:ring-gray-400"
      }`}
      style={{ backgroundColor: color }}
      aria-label={`Pick ${color}`}
    />
  );
}

interface IStickyColorBarProps {
  activeColor: string;
  onColorChange: (color: string) => void;
}
export function StickyColorBar({
  activeColor,
  onColorChange,
}: IStickyColorBarProps) {
  return (
    <div className="absolute left-[4.5rem] top-1/2 -translate-y-1/2 z-50 bg-white rounded-lg shadow-md p-2">
      <div className="grid grid-cols-2 gap-1.5">
        {STICKY_PALETTE.map((c) => (
          <SwatchButton
            key={c}
            color={c}
            active={c === activeColor}
            onClick={onColorChange}
          />
        ))}
      </div>
    </div>
  );
}
