import type { IElement } from "@engine/types";
import type { ElementStore } from "@engine/core/ElementStore";

const TYPE_LABELS: Record<string, string> = {
  text: "Текст",
  shape: "Фигура",
  sticky: "Стикер",
  connector: "Стрелка",
  stroke: "Рисунок",
  image: "Изображение",
};

const MAX_LABEL_LENGTH = 24;

// Генерирует короткий человекочитаемый label для AI context slot.
// Логика: пусто → "—"; >1 элементов → "N элементов";
// 1 элемент с непустым текстом → trim(text, 24) с многоточием при обрезке;
// 1 элемент без текста → русский перевод типа (или "элемент").
export function generateSlotLabel(
  ids: readonly string[],
  store: ElementStore,
): string {
  if (ids.length === 0) return "—";
  if (ids.length > 1) return `${ids.length} элементов`;

  const el: IElement | undefined = store.getById(ids[0]);
  if (!el) return "элемент";

  const raw = (el as unknown as Record<string, unknown>).text;
  const text = typeof raw === "string" ? raw.trim() : "";
  if (text) {
    return text.length > MAX_LABEL_LENGTH
      ? text.slice(0, MAX_LABEL_LENGTH) + "…"
      : text;
  }
  return TYPE_LABELS[el.type] ?? "элемент";
}

// Снапшот элемента для AI context slot. Отправляется на бэк ВМЕСТЕ с elementIds
// и служит фолбэком, если элемент ещё не персистнут в Redis на момент AI-запроса
// (гонка «нарисовал → прикрепил → отправил»). Набор полей совпадает с тем, что
// сериализует бэкенд в блок «ПРИКРЕПЛЁННЫЕ ГРУППЫ» — тяжёлые поля (html, points,
// src картинок) намеренно НЕ включаем, чтобы не раздувать payload.
export function snapshotElementForAi(el: IElement): Record<string, unknown> {
  const e = el as unknown as Record<string, unknown>;
  const snap: Record<string, unknown> = {
    id:   el.id,
    type: el.type,
    x:    e.x ?? null,
    y:    e.y ?? null,
    bbox: e.bbox ?? null,
  };
  if (el.type === "text" || el.type === "sticky" || el.type === "shape") {
    snap.text     = e.text;
    snap.fontSize = e.fontSize;
    snap.color    = e.color;
    snap.fillColor = e.fillColor;
  }
  if (el.type === "shape") {
    snap.shapeKind   = e.shapeKind;
    snap.width       = e.width;
    snap.height      = e.height;
    snap.strokeColor = e.strokeColor;
  }
  if (el.type === "connector") {
    snap.start = e.start;
    snap.end   = e.end;
    snap.label = e.label;
  }
  return snap;
}
