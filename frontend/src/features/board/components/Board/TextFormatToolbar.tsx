"use client";
import {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import {
  FONT_SIZE_STEP,
  MIN_TOOLBAR_FONT_SIZE,
  MAX_TOOLBAR_FONT_SIZE,
  TEXT_TOOLBAR_ITEMS,
} from "@/features/board/constants/text-toolbar.constant";
import { ColorPicker, TRANSPARENT_CHECKER_BG } from "./ColorPicker";
import type { IToolbarCallbacks } from "@/features/board/engine/editor/TextEditorOverlay";
import type { TShapeKind } from "@/features/board/engine/types";
import {
  RectIcon,
  EllipseIcon,
  DiamondIcon,
  TriangleIcon,
} from "./icons/ShapeIcons";

// Возвращает компонент иконки по shapeKind. Используется для отрисовки текущей
// фигуры на главной кнопке switcher'а и каждой опции внутри его SubBar.
function getShapeIcon(kind: TShapeKind) {
  switch (kind) {
    case "rect":
      return RectIcon;
    case "ellipse":
      return EllipseIcon;
    case "diamond":
      return DiamondIcon;
    case "triangle":
      return TriangleIcon;
  }
}
export interface TextFormatToolbarHandle {
  syncPosition: (cx: number, top: number) => void;
  updateFontSize: (size: number) => void;
  updateFormatStates: (states: IFormatStates) => void;
  updateColorState: (color: string | null) => void;
  updateHighlightState: (color: string | null) => void;
  updateListState: (type: "bullet" | "number" | null) => void;
  updateStickyState: (patch: { currentColor?: string }) => void;
  updateShapeState: (patch: {
    currentFillColor?: string;
    currentStrokeColor?: string;
    shapeKind?: TShapeKind;
  }) => void;
}
export interface IFormatStates {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikeThrough: boolean;
}
function Svg({ d, fill = false }: { d: string; fill?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      style={{ display: "block" }}
    >
      {fill ? (
        <path d={d} fill="currentColor" />
      ) : (
        <path
          d={d}
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      )}
    </svg>
  );
}
function ToolBtn({
  active = false,
  onClick,
  tooltip = "",
  children,
  className = "",
}: {
  active?: boolean;
  onClick: () => void;
  tooltip?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [tipPos, setTipPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  return (
    <>
      <button
        onClick={onClick}
        onMouseDown={(e) => e.preventDefault()}
        onMouseEnter={(e) => {
          if (timerRef.current) clearTimeout(timerRef.current);
          const r = e.currentTarget.getBoundingClientRect();
          setTipPos({ x: r.left + r.width / 2, y: r.top });
        }}
        onMouseLeave={() => {
          timerRef.current = setTimeout(() => setTipPos(null), 120);
        }}
        className={`w-10 h-10 flex items-center justify-center rounded-lg flex-shrink-0 border-none cursor-pointer transition-colors ${active ? "bg-blue-50 text-[#4262ff]" : "bg-transparent text-gray-800 hover:bg-gray-100"} ${className}`}
      >
        {children}
      </button>
      {tipPos &&
        tooltip &&
        createPortal(
          <div
            style={{
              position: "fixed",
              left: tipPos.x,
              top: tipPos.y - 10,
              transform: "translateX(-50%) translateY(-100%)",
              background: "#18181b",
              color: "#fff",
              fontSize: "12px",
              fontFamily: "Inter, sans-serif",
              padding: "4px 8px",
              borderRadius: "5px",
              pointerEvents: "none",
              whiteSpace: "nowrap",
              zIndex: 9999,
              boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
              lineHeight: "1.4",
            }}
          >
            {tooltip}
          </div>,
          document.body,
        )}
    </>
  );
}
function Separator() {
  return <div className="w-px h-5 bg-gray-200 mx-0.5 flex-shrink-0" />;
}
function SubBar({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+8px)] z-10 flex items-center gap-1 p-1.5 bg-white rounded-lg shadow-md whitespace-nowrap"
      onMouseDown={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
      }}
    >
      {children}
    </div>
  );
}
function FontSizeWidget({
  size,
  onChange,
}: {
  size: number;
  onChange: (s: number) => void;
}) {
  const adjust = (delta: number) => {
    const next = Math.min(
      MAX_TOOLBAR_FONT_SIZE,
      Math.max(MIN_TOOLBAR_FONT_SIZE, size + delta),
    );
    if (next !== size) onChange(next);
  };
  const ArrowBtn = ({ dir }: { dir: "up" | "down" }) => (
    <button
      title={dir === "up" ? "Увеличить размер" : "Уменьшить размер"}
      onClick={() => adjust(dir === "up" ? FONT_SIZE_STEP : -FONT_SIZE_STEP)}
      onMouseDown={(e) => e.preventDefault()}
      className="w-6 h-6 flex items-center justify-center rounded border-none bg-transparent text-gray-700 hover:bg-gray-200 cursor-pointer"
    >
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={dir === "up" ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} />
      </svg>
    </button>
  );
  return (
    <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg px-1 py-0.5 h-10 box-border">
      <ArrowBtn dir="down" />
      <span className="min-w-[28px] text-center text-[13px] font-medium text-gray-800 font-[Inter,sans-serif] leading-none select-none">
        {Math.round(size)}
      </span>
      <ArrowBtn dir="up" />
    </div>
  );
}
interface Props {
  ref: React.Ref<TextFormatToolbarHandle>;
  callbacks: IToolbarCallbacks;
  initialFontSize: number;
  initialAlign: "left" | "center" | "right";
  stickyMode?: {
    palette: readonly string[];
    currentColor: string;
    onPaletteChange: (color: string) => void;
  };
  shapeMode?: {
    fillPalette: readonly string[];
    currentFillColor: string;
    onFillChange: (color: string) => void;
    strokePalette: readonly string[];
    currentStrokeColor: string;
    onStrokeChange: (color: string) => void;
    shapeKind: TShapeKind;
    shapeKinds: readonly TShapeKind[];
    onShapeKindChange: (kind: TShapeKind) => void;
  };
}
export function TextFormatToolbar({
  ref,
  callbacks,
  initialFontSize,
  initialAlign,
  stickyMode,
  shapeMode,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(initialFontSize);
  const [formatStates, setFormatStates] = useState<IFormatStates>({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
  });
  const [align, setAlign] = useState<"left" | "center" | "right">(initialAlign);
  const [listState, setListState] = useState<"bullet" | "number" | null>(null);
  const [colorState, setColorState] = useState<string | null>(null);
  const [highlightState, setHighlightState] = useState<string | null>(null);
  const [stickyColor, setStickyColor] = useState<string | null>(
    stickyMode ? stickyMode.currentColor : null,
  );
  const [shapeFillColor, setShapeFillColor] = useState<string | null>(
    shapeMode ? shapeMode.currentFillColor : null,
  );
  const [shapeStrokeColor, setShapeStrokeColor] = useState<string | null>(
    shapeMode ? shapeMode.currentStrokeColor : null,
  );
  const [shapeKind, setShapeKind] = useState<TShapeKind | null>(
    shapeMode ? shapeMode.shapeKind : null,
  );
  type TOpen =
    | "fontStyle"
    | "align"
    | "list"
    | "link"
    | "color"
    | "highlight"
    | "stickyColor"
    | "shapeFill"
    | "shapeStroke"
    | "shapeKind"
    | null;
  const [openBar, setOpenBar] = useState<TOpen>(null);
  const [linkValue, setLinkValue] = useState("");
  const linkInputRef = useRef<HTMLInputElement>(null);

  // Закрытие активного попапа при клике вне корня тулбара. Цвет-пикеры теперь
  // не закрываются на клик свотча (можно перебирать), только outside-click.
  useEffect(() => {
    if (openBar === null) return;
    const onDocPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      const root = rootRef.current;
      if (!root || !target) return;
      if (root.contains(target)) return;
      setOpenBar(null);
      if (openBar === "link") callbacks.onLinkBarToggle(false);
      if (openBar === "color") callbacks.onColorBarToggle(false);
      if (openBar === "highlight") callbacks.onHighlightBarToggle(false);
    };
    document.addEventListener("pointerdown", onDocPointerDown);
    return () =>
      document.removeEventListener("pointerdown", onDocPointerDown);
  }, [openBar, callbacks]);
  const toggle = useCallback(
    (bar: TOpen) => {
      setOpenBar((prev) => {
        const next = prev === bar ? null : bar;
        if (next === "link") {
          setLinkValue("");
          requestAnimationFrame(() => linkInputRef.current?.focus());
          callbacks.onLinkBarToggle(true);
        } else if (prev === "link") {
          callbacks.onLinkBarToggle(false);
        }
        if (next === "color") callbacks.onColorBarToggle(true);
        if (prev === "color" && next !== "color")
          callbacks.onColorBarToggle(false);
        if (next === "highlight") callbacks.onHighlightBarToggle(true);
        if (prev === "highlight" && next !== "highlight")
          callbacks.onHighlightBarToggle(false);
        return next;
      });
    },
    [callbacks],
  );
  useImperativeHandle(
    ref,
    () => ({
      syncPosition(cx, top) {
        const el = rootRef.current;
        if (!el) return;
        el.style.left = `${cx}px`;
        el.style.top = `${top}px`;
        el.style.transform = "translateX(-50%) translateY(-100%)";
      },
      updateFontSize: setFontSize,
      updateFormatStates: setFormatStates,
      updateColorState: setColorState,
      updateHighlightState: setHighlightState,
      updateListState: setListState,
      updateStickyState(patch) {
        if (patch.currentColor !== undefined) setStickyColor(patch.currentColor);
      },
      updateShapeState(patch) {
        if (patch.currentFillColor !== undefined)
          setShapeFillColor(patch.currentFillColor);
        if (patch.currentStrokeColor !== undefined)
          setShapeStrokeColor(patch.currentStrokeColor);
        if (patch.shapeKind !== undefined) setShapeKind(patch.shapeKind);
      },
    }),
    [],
  );
  const handleAlignClick = (a: "left" | "center" | "right") => {
    setAlign(a);
    callbacks.onAlignChange(a);
    setOpenBar(null);
  };
  const handleFormatClick = (cmd: string) => {
    callbacks.onFormatCommand(cmd);
    requestAnimationFrame(() => {
      setFormatStates({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        strikeThrough: document.queryCommandState("strikeThrough"),
      });
    });
  };
  const handleListClick = (type: "bullet" | "number") => {
    callbacks.onListToggle(type);
    setListState((prev) => (prev === type ? null : type));
  };
  const confirmLink = () => {
    const url = linkValue.trim();
    setOpenBar(null);
    callbacks.onLinkBarToggle(false);
    if (url) callbacks.onInsertLink(url);
  };
  const handleFontSizeChange = (s: number) => {
    setFontSize(s);
    callbacks.onFontSizeChange(s);
  };
  const FORMAT_DEFS = [
    {
      cmd: "bold",
      label: "Жирный",
      active: formatStates.bold,
      icon: (
        <path
          d="M6 4h8a4 4 0 010 8H6zm0 8h9a4 4 0 010 8H6z"
          fill="currentColor"
        />
      ),
    },
    {
      cmd: "italic",
      label: "Курсив",
      active: formatStates.italic,
      icon: (
        <path
          d="M19 4h-9M14 20H5M15 4L9 20"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ),
    },
    {
      cmd: "underline",
      label: "Подчёркивание",
      active: formatStates.underline,
      icon: (
        <path
          d="M6 3v7a6 6 0 0012 0V3M4 21h16"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ),
    },
    {
      cmd: "strikeThrough",
      label: "Зачёркивание",
      active: formatStates.strikeThrough,
      icon: (
        <path
          d="M16 4H9a3 3 0 00-2.83 4M4 12h16M17.17 12C18.76 12.83 20 14.26 20 16a4 4 0 01-4 4H8.83"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ),
    },
  ];
  const ALIGN_DEFS: {
    align: "left" | "center" | "right";
    label: string;
    d: string;
  }[] = [
    { align: "left", label: "По левому краю", d: "M3 6h18M3 12h12M3 18h15" },
    { align: "center", label: "По центру", d: "M3 6h18M6 12h12M4 18h16" },
    { align: "right", label: "По правому краю", d: "M3 6h18M9 12h12M6 18h15" },
  ];
  const LIST_DEFS: {
    type: "bullet" | "number";
    label: string;
  }[] = [
    { type: "bullet", label: "Маркированный список" },
    { type: "number", label: "Нумерованный список" },
  ];
  const renderBtn = (
    item: (typeof TEXT_TOOLBAR_ITEMS)[number],
    idx: number,
  ) => {
    if (item.type === "separator") return <Separator key={`sep-${idx}`} />;
    const { id, tooltip, svgInner } = item;
    const svgEl = (
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        style={{ display: "block" }}
        dangerouslySetInnerHTML={{ __html: svgInner }}
      />
    );
    if (id === "fontStyle")
      return (
        <ToolBtn
          key={id}
          active={openBar === "fontStyle"}
          onClick={() => toggle("fontStyle")}
          tooltip={tooltip}
        >
          {svgEl}
        </ToolBtn>
      );
    if (id === "alignment")
      return (
        <ToolBtn
          key={id}
          active={openBar === "align"}
          onClick={() => toggle("align")}
          tooltip={tooltip}
        >
          {svgEl}
        </ToolBtn>
      );
    if (id === "list")
      return (
        <ToolBtn
          key={id}
          active={openBar === "list"}
          onClick={() => toggle("list")}
          tooltip={tooltip}
        >
          {svgEl}
        </ToolBtn>
      );
    if (id === "link")
      return (
        <ToolBtn
          key={id}
          active={openBar === "link"}
          onClick={() => toggle("link")}
          tooltip={tooltip}
        >
          {svgEl}
        </ToolBtn>
      );
    if (id === "highlight")
      return (
        <ToolBtn
          key={id}
          active={openBar === "highlight"}
          onClick={() => toggle("highlight")}
          tooltip={tooltip}
        >
          {svgEl}
        </ToolBtn>
      );
    if (id === "textColor")
      return (
        <ToolBtn
          key={id}
          active={openBar === "color"}
          onClick={() => toggle("color")}
          tooltip={tooltip}
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            style={{ display: "block" }}
          >
            <path
              d="M4 20L12 4l8 16M7.5 14h9"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <rect
              x="3"
              y="21.5"
              width="18"
              height="2"
              rx="1"
              fill={colorState ?? "currentColor"}
            />
          </svg>
        </ToolBtn>
      );
    return (
      <ToolBtn key={id} onClick={() => {}} tooltip={tooltip}>
        {svgEl}
      </ToolBtn>
    );
  };
  return (
    <div
      ref={rootRef}
      className="fixed flex items-center gap-1 px-1.5 py-1.5 bg-white rounded-lg shadow-md select-none whitespace-nowrap overflow-visible"
      style={{ zIndex: 150, pointerEvents: "auto" }}
      onMouseDown={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
      }}
    >
      {!stickyMode && !shapeMode && (
        <>
          <FontSizeWidget size={fontSize} onChange={handleFontSizeChange} />
          <Separator />
        </>
      )}
      {TEXT_TOOLBAR_ITEMS.map((item, idx) => renderBtn(item, idx))}
      {stickyMode && (
        <>
          <Separator />
          <ToolBtn
            active={openBar === "stickyColor"}
            onClick={() => toggle("stickyColor")}
            tooltip="Цвет стикера"
          >
            <span
              className="block w-5 h-5 rounded-full ring-1 ring-gray-300"
              style={{ backgroundColor: stickyColor ?? stickyMode.currentColor }}
            />
          </ToolBtn>
        </>
      )}
      {shapeMode && (
        <>
          <Separator />
          <ToolBtn
            active={openBar === "shapeFill"}
            onClick={() => toggle("shapeFill")}
            tooltip="Цвет заливки"
          >
            {(() => {
              const fill = shapeFillColor ?? shapeMode.currentFillColor;
              const isTransparent = fill === "transparent";
              return (
                <span
                  className="block w-5 h-5 rounded-full ring-1 ring-gray-300"
                  style={{
                    backgroundColor: isTransparent ? "#fff" : fill,
                    ...(isTransparent ? TRANSPARENT_CHECKER_BG : {}),
                  }}
                />
              );
            })()}
          </ToolBtn>
          <ToolBtn
            active={openBar === "shapeStroke"}
            onClick={() => toggle("shapeStroke")}
            tooltip="Цвет границы"
          >
            <span
              className="block w-5 h-5 rounded-full bg-white"
              style={{
                boxShadow: `inset 0 0 0 2px ${shapeStrokeColor ?? shapeMode.currentStrokeColor}`,
              }}
            />
          </ToolBtn>
          {(() => {
            const CurrentIcon = getShapeIcon(shapeKind ?? shapeMode.shapeKind);
            return (
              <ToolBtn
                active={openBar === "shapeKind"}
                onClick={() => toggle("shapeKind")}
                tooltip="Сменить фигуру"
              >
                <CurrentIcon />
              </ToolBtn>
            );
          })()}
        </>
      )}

      {openBar === "fontStyle" && (
        <SubBar>
          {FORMAT_DEFS.map((f) => (
            <ToolBtn
              key={f.cmd}
              active={f.active}
              onClick={() => handleFormatClick(f.cmd)}
              tooltip={f.label}
            >
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                style={{ display: "block" }}
              >
                {f.icon}
              </svg>
            </ToolBtn>
          ))}
        </SubBar>
      )}

      {openBar === "align" && (
        <SubBar>
          {ALIGN_DEFS.map((a) => (
            <ToolBtn
              key={a.align}
              active={align === a.align}
              onClick={() => handleAlignClick(a.align)}
              tooltip={a.label}
            >
              <Svg d={a.d} />
            </ToolBtn>
          ))}
        </SubBar>
      )}

      {openBar === "list" && (
        <SubBar>
          {LIST_DEFS.map((l) => (
            <ToolBtn
              key={l.type}
              active={listState === l.type}
              onClick={() => handleListClick(l.type)}
              tooltip={l.label}
            >
              {l.type === "bullet" ? (
                <Svg d="M9 6h11M9 12h11M9 18h11M5 6h.01M5 12h.01M5 18h.01" />
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  style={{ display: "block" }}
                >
                  <path
                    d="M10 6h11M10 12h11M10 18h11"
                    stroke="currentColor"
                    strokeWidth="2.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  <text
                    x="1"
                    y="7"
                    fontSize="6"
                    fill="currentColor"
                    fontFamily="sans-serif"
                  >
                    1.
                  </text>
                  <text
                    x="1"
                    y="13"
                    fontSize="6"
                    fill="currentColor"
                    fontFamily="sans-serif"
                  >
                    2.
                  </text>
                  <text
                    x="1"
                    y="19"
                    fontSize="6"
                    fill="currentColor"
                    fontFamily="sans-serif"
                  >
                    3.
                  </text>
                </svg>
              )}
            </ToolBtn>
          ))}
        </SubBar>
      )}

      {openBar === "link" && (
        <div
          className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+8px)] z-10 flex items-center gap-1.5 p-1.5 bg-white rounded-lg shadow-md whitespace-nowrap"
          onMouseDown={(e) => e.preventDefault()}
          onPointerDown={(e) => {
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
          }}
        >
          <input
            ref={linkInputRef}
            type="url"
            placeholder="https://"
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") {
                e.preventDefault();
                confirmLink();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setOpenBar(null);
                callbacks.onLinkBarToggle(false);
              }
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
            }}
            className="w-[220px] h-8 border border-gray-200 rounded-md px-2.5 text-[13px] text-gray-800 outline-none focus:border-[#4262ff] box-border"
          />
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={confirmLink}
            className="h-8 px-3 bg-[#4262ff] hover:bg-[#3251e8] text-white text-[13px] font-medium rounded-md flex-shrink-0 cursor-pointer border-none"
          >
            Готово
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setOpenBar(null);
              callbacks.onLinkBarToggle(false);
            }}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-transparent hover:bg-gray-100 text-gray-700 cursor-pointer border-none flex-shrink-0"
          >
            <Svg d="M18 6L6 18M6 6l12 12" />
          </button>
        </div>
      )}

      {openBar === "color" && (
        <ColorPicker
          presets={[
            "#222222",
            "#ffffff",
            "#6b7280",
            "#ef4444",
            "#f97316",
            "#f59e0b",
            "#22c55e",
            "#14b8a6",
            "#3b82f6",
            "#4262ff",
            "#9d6cff",
          ]}
          initialHistory={["#ff79d1", "#ffd233"]}
          selectedColor={colorState}
          onColorChange={(c) => callbacks.onColorChange(c)}
        />
      )}

      {openBar === "highlight" && (
        <ColorPicker
          presets={[
            "transparent",
            "#fef08a",
            "#fde68a",
            "#fed7aa",
            "#fecaca",
            "#fbcfe8",
            "#e9d5ff",
            "#bfdbfe",
            "#a7f3d0",
            "#bae6fd",
            "#c7d2fe",
          ]}
          initialHistory={["#d9f99d", "#fef3c7"]}
          selectedColor={highlightState}
          onColorChange={(c) => callbacks.onHighlightChange(c)}
        />
      )}

      {stickyMode && openBar === "stickyColor" && (
        <ColorPicker
          presets={[...stickyMode.palette]}
          initialHistory={[]}
          selectedColor={stickyColor ?? stickyMode.currentColor}
          onColorChange={(c) => {
            setStickyColor(c);
            stickyMode.onPaletteChange(c);
          }}
        />
      )}

      {shapeMode && openBar === "shapeFill" && (
        <ColorPicker
          presets={[...shapeMode.fillPalette]}
          initialHistory={[]}
          selectedColor={shapeFillColor ?? shapeMode.currentFillColor}
          onColorChange={(c) => {
            setShapeFillColor(c);
            shapeMode.onFillChange(c);
          }}
        />
      )}

      {shapeMode && openBar === "shapeStroke" && (
        <ColorPicker
          presets={[...shapeMode.strokePalette]}
          initialHistory={[]}
          selectedColor={shapeStrokeColor ?? shapeMode.currentStrokeColor}
          onColorChange={(c) => {
            setShapeStrokeColor(c);
            shapeMode.onStrokeChange(c);
          }}
        />
      )}

      {shapeMode && openBar === "shapeKind" && (
        <SubBar>
          {shapeMode.shapeKinds.map((kind) => {
            const Icon = getShapeIcon(kind);
            return (
              <ToolBtn
                key={kind}
                active={(shapeKind ?? shapeMode.shapeKind) === kind}
                onClick={() => {
                  setShapeKind(kind);
                  shapeMode.onShapeKindChange(kind);
                  setOpenBar(null);
                }}
                tooltip={`Сменить на ${kind}`}
              >
                <Icon />
              </ToolBtn>
            );
          })}
        </SubBar>
      )}
    </div>
  );
}
