"use client";
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type RefObject,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

interface IBoardContextMenuProps {
  isOpen: boolean;
  isFavorite: boolean;
  isPrivate: boolean;
  boardId: string;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onToggleFavorite: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDetails: () => void;
  onTogglePrivate: () => void;
  onDelete: () => void;
  onChangeThumbnail: () => void;
  onExportBackup: () => void;
  onMoveToSpace: () => void;
}

interface IMenuItem {
  id: string;
  label: string;
  iconPath: string;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  highlight?: boolean;
  badge?: ReactNode;
}

type TMenuRow = IMenuItem | "separator";

const MENU_WIDTH = 248;
const MENU_HEIGHT_ESTIMATE = 480;

// Конфигурация строк меню с действиями над доской.
function getMenuRows(
  isFavorite: boolean,
  isPrivate: boolean,
  boardId: string,
  onToggleFavorite: () => void,
  onRename: () => void,
  onDuplicate: () => void,
  onDetails: () => void,
  onTogglePrivate: () => void,
  onDelete: () => void,
  onChangeThumbnail: () => void,
  onExportBackup: () => void,
  onMoveToSpace: () => void,
): TMenuRow[] {
  const boardUrl = `${window.location.origin}/app/board/${boardId}`;
  return [
    {
      id: "share",
      label: "Поделиться",
      iconPath:
        "M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.658m-6.632-6.342l6.632-3.658m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z",
      onClick: () => {
        navigator.clipboard.writeText(boardUrl);
        toast.success("Ссылка скопирована");
      },
    },
    {
      id: "newTab",
      label: "Открыть в новой вкладке",
      iconPath:
        "M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14",
      onClick: () => window.open(`/app/board/${boardId}`, "_blank"),
    },
    "separator",
    {
      id: "star",
      label: isFavorite ? "Убрать из избранного" : "В избранное",
      iconPath:
        "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
      highlight: isFavorite,
      onClick: onToggleFavorite,
    },
    {
      id: "rename",
      label: "Переименовать",
      iconPath:
        "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
      onClick: onRename,
    },
    {
      id: "duplicate",
      label: "Дублировать",
      iconPath:
        "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z",
      onClick: onDuplicate,
    },
    {
      id: "thumb",
      label: "Изменить обложку",
      iconPath:
        "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
      onClick: onChangeThumbnail,
    },
    {
      id: "details",
      label: "Детали доски",
      iconPath: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
      onClick: onDetails,
    },
    {
      id: "private",
      label: isPrivate ? "Сделать публичной" : "Сделать приватной",
      iconPath: isPrivate
        ? "M8 11V7a4 4 0 018 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
        : "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
      onClick: onTogglePrivate,
    },
    {
      id: "backup",
      label: "Скачать резервную копию",
      iconPath:
        "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4",
      onClick: onExportBackup,
    },
    "separator",
    {
      id: "move",
      label: "Переместить в пространство",
      iconPath: "M17 8l4 4m0 0l-4 4m4-4H3",
      onClick: onMoveToSpace,
    },
    "separator",
    {
      id: "delete",
      label: "Удалить",
      iconPath:
        "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
      danger: true,
      onClick: onDelete,
    },
  ];
}

// Позиция меню относительно trigger-кнопки с учётом границ окна.
function calcPosition(button: HTMLElement): { top: number; left: number } {
  const rect = button.getBoundingClientRect();
  let top = rect.bottom + 6;
  let left = rect.right - MENU_WIDTH;
  if (top + MENU_HEIGHT_ESTIMATE > window.innerHeight) {
    top = Math.max(8, rect.top - MENU_HEIGHT_ESTIMATE - 6);
  }
  if (left < 8) left = 8;
  return { top, left };
}

// Контекстное меню действий над доской с порталом и outside-click.
export function BoardContextMenu({
  isOpen,
  isFavorite,
  isPrivate,
  boardId,
  triggerRef,
  onClose,
  onToggleFavorite,
  onRename,
  onDuplicate,
  onDetails,
  onTogglePrivate,
  onDelete,
  onChangeThumbnail,
  onExportBackup,
  onMoveToSpace,
}: IBoardContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [visible, setVisible] = useState(false);

  const close = useCallback(() => {
    setVisible(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      setPosition(calcPosition(triggerRef.current));
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setVisible(true)),
      );
    } else {
      setVisible(false);
      setPosition(null);
    }
  }, [isOpen, triggerRef]);

  useEffect(() => {
    if (!isOpen) return;
    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !menuRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        close();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, close, triggerRef]);

  if (!position) return null;

  return createPortal(
    <div
      ref={menuRef}
      style={{ top: position.top, left: position.left }}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      className={`
        fixed z-[9999] w-[248px]
        bg-white rounded-xl border border-gray-200 shadow-lg
        transition-all duration-150 ease-out origin-top-right
        ${visible ? "opacity-100 scale-100" : "opacity-0 scale-95"}
      `}
    >
      <div className="p-1.5">
        {getMenuRows(
          isFavorite,
          isPrivate,
          boardId,
          onToggleFavorite,
          onRename,
          onDuplicate,
          onDetails,
          onTogglePrivate,
          onDelete,
          onChangeThumbnail,
          onExportBackup,
          onMoveToSpace,
        ).map((row, index) => {
          if (row === "separator") {
            return (
              <div key={`sep-${index}`} className="my-1 h-px bg-gray-100" />
            );
          }
          const { id, label, iconPath, danger, disabled, highlight, badge } =
            row;
          return (
            <button
              key={id}
              disabled={disabled}
              onClick={() => {
                row.onClick?.();
                close();
              }}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition
                ${
                  danger
                    ? "text-red-500 hover:bg-red-50"
                    : disabled
                      ? "text-gray-300 cursor-default"
                      : "text-gray-700 hover:bg-gray-100"
                }
              `}
            >
              <svg
                className={`w-5 h-5 flex-shrink-0 ${danger ? "text-red-400" : disabled ? "text-gray-300" : ""}`}
                fill={highlight ? "#facc15" : "none"}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={iconPath}
                />
              </svg>
              <span className="flex-1 truncate">{label}</span>
              {badge}
            </button>
          );
        })}
      </div>
    </div>,
    document.body,
  );
}
