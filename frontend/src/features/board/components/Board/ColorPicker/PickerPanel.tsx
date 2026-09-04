"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  PICKER_HUE_HEIGHT,
  PICKER_PANEL_MIN_WIDTH,
  PICKER_SV_HEIGHT,
  PICKER_SV_WIDTH,
  POPOVER_POSITION_CLASSES,
} from "./constants";
import { hexToHsv, hsvToHex } from "./hsv";

interface IPickerPanelProps {
  hue: number;
  sat: number;
  val: number;
  onHsvChange: (h: number, s: number, v: number) => void;
  onApply: (hex: string) => void;
}

// HSV-пикер: SV-градиент (saturation x value) + hue-полоса + hex-input + Применить.
// Canvas-рисование, т.к. дёшево и не требует внешних зависимостей.
export function PickerPanel({
  hue,
  sat,
  val,
  onHsvChange,
  onApply,
}: IPickerPanelProps) {
  const svRef = useRef<HTMLCanvasElement>(null);
  const hueRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef<"sv" | "hue" | null>(null);
  const [hexInput, setHexInput] = useState(() =>
    hsvToHex(hue, sat, val).toUpperCase(),
  );

  // SV-плоскость: горизонталь - sat от белого к чистому hue, вертикаль - value
  // от полного к чёрному. Поверх кружок-маркер текущей позиции.
  useEffect(() => {
    const canvas = svRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width: w, height: h } = canvas;
    const gh = ctx.createLinearGradient(0, 0, w, 0);
    gh.addColorStop(0, "#fff");
    gh.addColorStop(1, hsvToHex(hue, 1, 1));
    ctx.fillStyle = gh;
    ctx.fillRect(0, 0, w, h);
    const gv = ctx.createLinearGradient(0, 0, 0, h);
    gv.addColorStop(0, "rgba(0,0,0,0)");
    gv.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = gv;
    ctx.fillRect(0, 0, w, h);
    const cx = sat * w;
    const cy = (1 - val) * h;
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fillStyle = hsvToHex(hue, sat, val);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [hue, sat, val]);

  // Hue-полоса: радуга 0..360 с белой вертикальной чертой на текущем hue.
  useEffect(() => {
    const canvas = hueRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width: w, height: h } = canvas;
    const g = ctx.createLinearGradient(0, 0, w, 0);
    ["#f00", "#ff0", "#0f0", "#0ff", "#00f", "#f0f", "#f00"].forEach((c, i) =>
      g.addColorStop(i / 6, c),
    );
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const cx = (hue / 360) * w;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 2;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, h);
    ctx.stroke();
    ctx.restore();
  }, [hue]);

  const handleSVPointer = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>, phase: "down" | "move") => {
      if (phase === "down") {
        e.currentTarget.setPointerCapture(e.pointerId);
        dragging.current = "sv";
      }
      if (dragging.current !== "sv") return;
      const r = e.currentTarget.getBoundingClientRect();
      const newSat = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      const newVal = Math.max(
        0,
        Math.min(1, 1 - (e.clientY - r.top) / r.height),
      );
      onHsvChange(hue, newSat, newVal);
      setHexInput(hsvToHex(hue, newSat, newVal).toUpperCase());
    },
    [hue, onHsvChange],
  );

  const handleHuePointer = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>, phase: "down" | "move") => {
      if (phase === "down") {
        e.currentTarget.setPointerCapture(e.pointerId);
        dragging.current = "hue";
      }
      if (dragging.current !== "hue") return;
      const r = e.currentTarget.getBoundingClientRect();
      const newHue = Math.max(
        0,
        Math.min(360, ((e.clientX - r.left) / r.width) * 360),
      );
      onHsvChange(newHue, sat, val);
      setHexInput(hsvToHex(newHue, sat, val).toUpperCase());
    },
    [sat, val, onHsvChange],
  );

  const stopPointerDownPropagation = (e: React.PointerEvent | React.MouseEvent) => {
    e.stopPropagation();
    if ("nativeEvent" in e) e.nativeEvent.stopImmediatePropagation();
  };

  const handleHexInputChange = (raw: string) => {
    setHexInput(raw.toUpperCase());
    const hex = raw.startsWith("#") ? raw : `#${raw}`;
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
      const hsv = hexToHsv(hex);
      if (hsv) onHsvChange(hsv.h, hsv.s, hsv.v);
    }
  };

  return (
    <div
      className={`${POPOVER_POSITION_CLASSES} z-20 flex flex-col gap-2 p-2.5 bg-white rounded-lg shadow-lg`}
      style={{ minWidth: PICKER_PANEL_MIN_WIDTH }}
      onMouseDown={(e) => e.preventDefault()}
      onPointerDown={stopPointerDownPropagation}
    >
      <canvas
        ref={svRef}
        width={PICKER_SV_WIDTH}
        height={PICKER_SV_HEIGHT}
        className="rounded cursor-crosshair block touch-none"
        onPointerDown={(e) => handleSVPointer(e, "down")}
        onPointerMove={(e) => handleSVPointer(e, "move")}
        onPointerUp={() => {
          dragging.current = null;
        }}
      />
      <canvas
        ref={hueRef}
        width={PICKER_SV_WIDTH}
        height={PICKER_HUE_HEIGHT}
        className="rounded-full cursor-ew-resize block touch-none"
        onPointerDown={(e) => handleHuePointer(e, "down")}
        onPointerMove={(e) => handleHuePointer(e, "move")}
        onPointerUp={() => {
          dragging.current = null;
        }}
      />
      <div className="flex items-center gap-1.5">
        <input
          value={hexInput}
          maxLength={7}
          placeholder="#000000"
          onChange={(e) => handleHexInputChange(e.target.value.trim())}
          onPointerDown={stopPointerDownPropagation}
          onKeyDown={(e) => e.stopPropagation()}
          className="flex-1 h-8 border border-gray-200 rounded-md px-2 text-xs font-mono text-gray-800 outline-none focus:border-[#4262ff] uppercase box-border"
        />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onApply(hsvToHex(hue, sat, val))}
          className="h-8 px-3 bg-[#4262ff] hover:bg-[#3251e8] text-white text-xs font-medium rounded-md flex-shrink-0 cursor-pointer border-none"
        >
          Применить
        </button>
      </div>
    </div>
  );
}
