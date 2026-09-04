"use client";
interface Props {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
}
export function ZoomWidget({ zoom, onZoomIn, onZoomOut }: Props) {
  const pct = Math.round(zoom * 100);
  return (
    <div className="absolute bottom-4 right-4 flex items-center bg-white rounded-lg shadow-md overflow-hidden select-none">
      <button
        onClick={onZoomOut}
        title="Уменьшить"
        className="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
      >
        <i className="fas fa-minus text-sm leading-none" />
      </button>

      <span className="w-14 text-center text-sm font-medium text-gray-700 tabular-nums">
        {pct}%
      </span>

      <button
        onClick={onZoomIn}
        title="Увеличить"
        className="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
      >
        <i className="fas fa-plus text-sm leading-none" />
      </button>
    </div>
  );
}
