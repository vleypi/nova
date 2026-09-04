"use client";
import { TPenTool } from "@/features/board/engine/types";
function PencilIcon() {
  return <i className="fas fa-pencil text-base leading-none" />;
}
function EraserIcon() {
  return <i className="fas fa-eraser text-base leading-none" />;
}
interface ISubToolButtonProps {
  tool: TPenTool;
  activePenTool: TPenTool;
  title: string;
  onClick: (tool: TPenTool) => void;
  children: React.ReactNode;
}
function SubToolButton({
  tool,
  activePenTool,
  title,
  onClick,
  children,
}: ISubToolButtonProps) {
  const isActive = tool === activePenTool;
  return (
    <button
      title={title}
      onClick={() => onClick(tool)}
      className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
        isActive
          ? "bg-blue-50 text-[#4262ff]"
          : "text-gray-800 hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}
interface IPenSubToolbarProps {
  activePenTool: TPenTool;
  onPenToolChange: (tool: TPenTool) => void;
}
export function PenSubToolbar({
  activePenTool,
  onPenToolChange,
}: IPenSubToolbarProps) {
  return (
    <div className="absolute left-[4.5rem] top-1/2 -translate-y-1/2 z-50 bg-white rounded-lg shadow-md flex flex-col items-center gap-1 py-2 px-1.5">
      <SubToolButton
        tool="pencil"
        activePenTool={activePenTool}
        title="Карандаш"
        onClick={onPenToolChange}
      >
        <PencilIcon />
      </SubToolButton>
      <SubToolButton
        tool="eraser"
        activePenTool={activePenTool}
        title="Ластик"
        onClick={onPenToolChange}
      >
        <EraserIcon />
      </SubToolButton>
    </div>
  );
}
