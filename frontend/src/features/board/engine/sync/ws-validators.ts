import { IElement } from "@engine/types";
import {
  WS_MAX_ID_LENGTH,
  WS_MAX_STRING_LENGTH,
  MIN_STICKY_SIZE,
  STICKY_MIN_FONT_SIZE,
  STICKY_MAX_FONT_SIZE,
} from "@/features/board/constants/board.constant";

const VALID_TYPES = new Set([
  "stroke",
  "text",
  "connector",
  "sticky",
  "image",
  "shape",
]);
const VALID_IMAGE_STATUSES = new Set(["pending", "ready", "failed"]);
const VALID_OBJECT_FITS = new Set(["contain", "cover", "fill"]);
const VALID_SIDES = new Set(["top", "right", "bottom", "left"]);
const VALID_ARROW_ENDS = new Set(["none", "arrow", "circle"]);
const VALID_ALIGNS = new Set(["left", "center", "right"]);
const SHA256_RE = /^[a-f0-9]{64}$/;
const HEX6_RE = /^#[0-9a-fA-F]{6}$/;
const VALID_SHAPE_KINDS = new Set([
  "rect",
  "ellipse",
  "diamond",
  "triangle",
]);

// Проверяет что значение похоже на валидный IElement, пришедший от другого клиента.
// Используется для отсева мусорных и потенциально опасных сообщений из сокета.
export function isValidElement(el: unknown): el is IElement {
  if (!isValidBaseFields(el)) return false;
  const e = el as Record<string, unknown>;
  switch (e.type) {
    case "stroke":
      return isValidStroke(e);
    case "text":
      return isValidText(e);
    case "connector":
      return isValidConnector(e);
    case "sticky":
      return isValidSticky(e);
    case "image":
      return isValidImage(e);
    case "shape":
      return isValidShape(e);
    default:
      return false;
  }
}

// Patch для update должен быть обычным объектом, не массивом и не null.
export function isValidPatch(patch: unknown): patch is Record<string, unknown> {
  return !!patch && typeof patch === "object" && !Array.isArray(patch);
}

// Массив id'ов для удаления: непустой, все элементы строки в пределах лимита.
export function isValidElementIds(ids: unknown): ids is string[] {
  return (
    Array.isArray(ids) &&
    ids.length > 0 &&
    ids.every(
      (id) =>
        typeof id === "string" &&
        id.length > 0 &&
        id.length <= WS_MAX_ID_LENGTH,
    )
  );
}

// Общие поля любого элемента: id, type, boardId, userId.
function isValidBaseFields(el: unknown): boolean {
  if (!el || typeof el !== "object" || Array.isArray(el)) return false;
  const e = el as Record<string, unknown>;
  if (
    typeof e.id !== "string" ||
    e.id.length === 0 ||
    e.id.length > WS_MAX_ID_LENGTH
  ) {
    return false;
  }
  if (!VALID_TYPES.has(e.type as string)) return false;
  if (typeof e.boardId !== "string" || e.boardId.length === 0) return false;
  if (typeof e.userId !== "string") return false;
  return true;
}

function isValidStroke(e: Record<string, unknown>): boolean {
  if (!Array.isArray(e.points)) return false;
  if (typeof e.color !== "string") return false;
  if (typeof e.width !== "number" || e.width <= 0) return false;
  return true;
}

function isValidText(e: Record<string, unknown>): boolean {
  if (typeof e.text !== "string" || e.text.length > WS_MAX_STRING_LENGTH) {
    return false;
  }
  if (typeof e.x !== "number" || typeof e.y !== "number") return false;
  if (typeof e.fontSize !== "number" || e.fontSize <= 0) return false;
  if (typeof e.color !== "string") return false;
  return true;
}

function isValidConnector(e: Record<string, unknown>): boolean {
  if (!isValidConnectorEndpoint(e.start)) return false;
  if (!isValidConnectorEndpoint(e.end)) return false;
  if (typeof e.strokeColor !== "string") return false;
  if (typeof e.strokeWidth !== "number" || e.strokeWidth <= 0) return false;
  if (!VALID_ARROW_ENDS.has(e.startArrow as string)) return false;
  if (!VALID_ARROW_ENDS.has(e.endArrow as string)) return false;
  if (typeof e.curved !== "boolean") return false;
  if (
    e.label !== undefined &&
    (typeof e.label !== "string" || e.label.length > WS_MAX_STRING_LENGTH)
  ) {
    return false;
  }
  return true;
}

function isValidSticky(e: Record<string, unknown>): boolean {
  if (typeof e.x !== "number" || typeof e.y !== "number") return false;
  if (typeof e.width !== "number" || e.width < MIN_STICKY_SIZE) return false;
  if (typeof e.height !== "number" || e.height < MIN_STICKY_SIZE) return false;
  if (typeof e.color !== "string" || !HEX6_RE.test(e.color)) return false;
  if (typeof e.html !== "string" || e.html.length > WS_MAX_STRING_LENGTH) {
    return false;
  }
  if (typeof e.text !== "string" || e.text.length > WS_MAX_STRING_LENGTH) {
    return false;
  }
  if (
    typeof e.fontSize !== "number" ||
    e.fontSize < STICKY_MIN_FONT_SIZE ||
    e.fontSize > STICKY_MAX_FONT_SIZE
  ) {
    return false;
  }
  if (typeof e.autoFontSize !== "boolean") return false;
  if (!VALID_ALIGNS.has(e.textAlign as string)) return false;
  return true;
}

function isValidImage(e: Record<string, unknown>): boolean {
  if (typeof e.x !== "number" || typeof e.y !== "number") return false;
  if (typeof e.width !== "number" || e.width <= 0) return false;
  if (typeof e.height !== "number" || e.height <= 0) return false;
  if (typeof e.mime !== "string") return false;
  if (typeof e.sha256 !== "string" || !SHA256_RE.test(e.sha256)) return false;
  if (!VALID_IMAGE_STATUSES.has(e.status as string)) return false;
  if (e.src !== null && typeof e.src !== "string") return false;
  if (e.assetId !== null && typeof e.assetId !== "string") return false;
  if (!VALID_OBJECT_FITS.has(e.objectFit as string)) return false;
  if (e.alt !== undefined && typeof e.alt !== "string") return false;
  return true;
}

function isValidShape(e: Record<string, unknown>): boolean {
  if (!VALID_SHAPE_KINDS.has(e.shapeKind as string)) return false;
  if (typeof e.x !== "number" || typeof e.y !== "number") return false;
  if (typeof e.width !== "number" || e.width <= 0) return false;
  if (typeof e.height !== "number" || e.height <= 0) return false;
  if (typeof e.strokeColor !== "string") return false;
  if (typeof e.strokeWidth !== "number" || e.strokeWidth <= 0) return false;
  if (typeof e.fillColor !== "string") return false;
  if (typeof e.text !== "string" || e.text.length > WS_MAX_STRING_LENGTH) {
    return false;
  }
  if (typeof e.html !== "string" || e.html.length > WS_MAX_STRING_LENGTH) {
    return false;
  }
  if (
    typeof e.fontSize !== "number" ||
    e.fontSize < STICKY_MIN_FONT_SIZE ||
    e.fontSize > STICKY_MAX_FONT_SIZE
  ) {
    return false;
  }
  if (typeof e.autoFontSize !== "boolean") return false;
  if (!VALID_ALIGNS.has(e.textAlign as string)) return false;
  return true;
}

// Endpoint коннектора: либо free (мировые координаты), либо anchor (привязка к элементу).
function isValidConnectorEndpoint(endpoint: unknown): boolean {
  if (!endpoint || typeof endpoint !== "object") return false;
  const obj = endpoint as Record<string, unknown>;
  if (obj.kind === "free") {
    return (
      typeof obj.x === "number" &&
      typeof obj.y === "number" &&
      isFinite(obj.x as number) &&
      isFinite(obj.y as number)
    );
  }
  if (obj.kind === "anchor") {
    return (
      typeof obj.elementId === "string" &&
      obj.elementId.length > 0 &&
      obj.elementId.length <= WS_MAX_ID_LENGTH &&
      VALID_SIDES.has(obj.side as string)
    );
  }
  return false;
}
