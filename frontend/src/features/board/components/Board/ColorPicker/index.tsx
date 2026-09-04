"use client";
import { useState } from "react";
import { POPOVER_POSITION_CLASSES } from "./constants";
import { PickerPanel } from "./PickerPanel";
import { Swatch } from "./Swatch";

export { TRANSPARENT_CHECKER_BG } from "./constants";

export interface ColorPickerProps {
  presets: string[];
  initialHistory?: (string | null)[];
  selectedColor?: string | null;
  onColorChange: (color: string) => void;
}

// Палитра цветов: пресеты + история кастомных + кнопка-триггер HSV-пикера.
// Свотчи в едином стиле через <Swatch />. Попап остаётся открытым на клик
// свотча - закрывается родителем по outside-click.
export function ColorPicker({
  presets,
  initialHistory = [null, null],
  selectedColor,
  onColorChange,
}: ColorPickerProps) {
  const [history, setHistory] = useState<(string | null)[]>(initialHistory);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [lastCustom, setLastCustom] = useState<string | null>(null);
  const [hue, setHue] = useState(0);
  const [sat, setSat] = useState(1);
  const [val, setVal] = useState(1);

  const isSelected = (c: string): boolean =>
    !!selectedColor && c.toLowerCase() === selectedColor.toLowerCase();

  // History-цвета, уже присутствующие в presets, скрываем (свотч становится
  // пустым серым слотом). Иначе один цвет дважды бы подсвечивался активным.
  const presetSet = new Set(presets.map((p) => p.toLowerCase()));
  const visibleHistory = history.map((c) =>
    c && presetSet.has(c.toLowerCase()) ? null : c,
  );

  const applyCustom = (hex: string): void => {
    // Сдвиг истории через функциональный setLastCustom, чтобы не словить
    // stale-замыкание на предыдущем lastCustom.
    setHistory((prev) => {
      const next = [...prev];
      setLastCustom((prevCustom) => {
        if (prevCustom) {
          next[1] = next[0];
          next[0] = prevCustom;
        }
        return hex;
      });
      return next;
    });
    setPickerOpen(false);
    onColorChange(hex);
  };

  return (
    <div
      className={`${POPOVER_POSITION_CLASSES} z-10 grid grid-cols-7 gap-1.5 p-2 bg-white rounded-lg shadow-md overflow-visible`}
      onMouseDown={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
      }}
    >
      {presets.map((c) => (
        <Swatch
          key={c}
          color={c}
          active={isSelected(c)}
          title={c === "transparent" ? "Без заливки" : c}
          onClick={() => onColorChange(c)}
        />
      ))}

      {visibleHistory.map((c, i) => (
        <Swatch
          key={`hist-${i}`}
          color={c}
          active={c ? isSelected(c) : false}
          onClick={c ? () => onColorChange(c) : undefined}
        />
      ))}

      <Swatch color={lastCustom} onClick={() => setPickerOpen((o) => !o)}>
        <svg
          viewBox="0 0 16 16"
          width="11"
          height="11"
          fill="none"
          stroke={lastCustom ? "white" : "#6b7280"}
          strokeWidth="2.2"
          strokeLinecap="round"
          style={{
            display: "block",
            filter: lastCustom
              ? "drop-shadow(0 0 1px rgba(0,0,0,0.7))"
              : "none",
          }}
        >
          <line x1="8" y1="2" x2="8" y2="14" />
          <line x1="2" y1="8" x2="14" y2="8" />
        </svg>
      </Swatch>

      {pickerOpen && (
        <PickerPanel
          hue={hue}
          sat={sat}
          val={val}
          onHsvChange={(h, s, v) => {
            setHue(h);
            setSat(s);
            setVal(v);
          }}
          onApply={applyCustom}
        />
      )}
    </div>
  );
}
