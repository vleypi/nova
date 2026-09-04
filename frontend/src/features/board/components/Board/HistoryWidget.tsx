"use client";

interface Props {
  onUndo: () => void;
  onRedo: () => void;
}

function UndoIcon() {
  return <i className="fas fa-rotate-left text-base leading-none" />;
}

function RedoIcon() {
  return <i className="fas fa-rotate-right text-base leading-none" />;
}

export function HistoryWidget({ onUndo, onRedo }: Props) {
  return (
    <div className="bg-white rounded-lg shadow-md flex flex-col items-center gap-1 py-2 px-1.5">
      <button
        onClick={onUndo}
        title="Отменить · Ctrl+Z"
        className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-800 hover:bg-gray-100 transition-colors"
      >
        <UndoIcon />
      </button>
      <button
        onClick={onRedo}
        title="Повторить · Ctrl+Y"
        className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-800 hover:bg-gray-100 transition-colors"
      >
        <RedoIcon />
      </button>
    </div>
  );
}
