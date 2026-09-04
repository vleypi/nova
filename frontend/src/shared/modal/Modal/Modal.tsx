"use client";
import { IModalProps } from "../modal.types";

const SIZE_CLASSES: Record<string, string> = {
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-6xl",
};

// Базовая модалка с overlay, fade-in/scale-in анимацией и close-кнопкой.
export function Modal({
  title,
  visible,
  onClose,
  children,
  size = "md",
  noPadding = false,
  scrollInner = false,
}: IModalProps) {
  return (
    <div
      className={`fixed inset-0 z-[200] bg-black/40 transition-opacity duration-200 ${scrollInner ? "flex items-center justify-center p-4" : "overflow-y-auto"} ${visible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      onClick={(event) => {
        event.stopPropagation();
        onClose();
      }}
    >
      <div
        className={
          scrollInner
            ? "w-full flex items-center justify-center"
            : "flex min-h-full items-center justify-center p-4"
        }
      >
        <div
          className={`relative bg-white rounded-2xl shadow-2xl w-full ${SIZE_CLASSES[size]} transition-all duration-200 ${scrollInner ? "flex flex-col h-[85vh]" : ""} ${visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-2"}`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-nova-gray/50">
            <h2 className="text-base font-semibold text-nova-dark">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-nova-dark hover:bg-nova-gray/30 transition-colors"
              aria-label="Закрыть"
            >
              <i className="fas fa-times text-sm" />
            </button>
          </div>

          <div
            className={`${scrollInner ? "flex-1 min-h-0 flex flex-col" : ""} ${noPadding ? "" : "p-6"}`}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
