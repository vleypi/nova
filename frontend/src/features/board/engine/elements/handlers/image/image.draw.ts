import type { IImageElement } from "@engine/types";
import type { IElementResolver } from "@engine/elements/interfaces/element-handler";
import { rectContains, rectIntersects } from "@engine/utils/bbox";
import {
  IMAGE_PLACEHOLDER_BG,
  IMAGE_PLACEHOLDER_BORDER,
  IMAGE_PLACEHOLDER_TEXT,
  IMAGE_FAILED_BORDER,
  IMAGE_PLACEHOLDER_BORDER_WIDTH,
  IMAGE_PLACEHOLDER_INSET_PX,
  IMAGE_PLACEHOLDER_FONT,
  IMAGE_PLACEHOLDER_TEXT_BOTTOM_PAD_PX,
  IMAGE_SPINNER_MAX_RADIUS_PX,
  IMAGE_SPINNER_RADIUS_DIVIDER,
  IMAGE_SPINNER_LINE_WIDTH,
  IMAGE_SPINNER_PERIOD_MS,
  IMAGE_SPINNER_ARC_ANGLE,
} from "@/features/board/constants/board.constant";

// Рисует серый placeholder-прямоугольник с текстом и опциональным спиннером.
// Используется для статусов pending/failed/unavailable и пока кеш не вернул картинку.
function drawPlaceholder(
  ctx: CanvasRenderingContext2D,
  el: IImageElement,
  borderColor: string,
  label: string,
  withSpinner: boolean,
): void {
  ctx.save();
  ctx.fillStyle = IMAGE_PLACEHOLDER_BG;
  ctx.fillRect(el.x, el.y, el.width, el.height);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = IMAGE_PLACEHOLDER_BORDER_WIDTH;
  ctx.strokeRect(
    el.x + IMAGE_PLACEHOLDER_INSET_PX,
    el.y + IMAGE_PLACEHOLDER_INSET_PX,
    el.width - 2 * IMAGE_PLACEHOLDER_INSET_PX,
    el.height - 2 * IMAGE_PLACEHOLDER_INSET_PX,
  );

  if (withSpinner) {
    drawSpinner(ctx, el);
  }

  ctx.fillStyle = IMAGE_PLACEHOLDER_TEXT;
  ctx.font = IMAGE_PLACEHOLDER_FONT;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText(
    label,
    el.x + el.width / 2,
    el.y + el.height - IMAGE_PLACEHOLDER_TEXT_BOTTOM_PAD_PX,
  );
  ctx.restore();
}

// Рисует анимированный спиннер по центру placeholder-а.
// Угол вращения берётся из performance.now() с периодом IMAGE_SPINNER_PERIOD_MS.
function drawSpinner(
  ctx: CanvasRenderingContext2D,
  el: IImageElement,
): void {
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  const r = Math.min(
    IMAGE_SPINNER_MAX_RADIUS_PX,
    Math.min(el.width, el.height) / IMAGE_SPINNER_RADIUS_DIVIDER,
  );
  const t = performance.now() / IMAGE_SPINNER_PERIOD_MS;
  ctx.strokeStyle = IMAGE_PLACEHOLDER_TEXT;
  ctx.lineWidth = IMAGE_SPINNER_LINE_WIDTH;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, cy, r, t, t + IMAGE_SPINNER_ARC_ANGLE);
  ctx.stroke();
}

// Прямоугольник видимой части картинки внутри слота с учётом objectFit + naturalDims.
// Для contain даёт уменьшенный rect (letterbox); для cover/fill = слот целиком.
export function computeImageVisibleRect(
  el: IImageElement,
  naturalWidth: number,
  naturalHeight: number,
): { x: number; y: number; width: number; height: number } {
  const { x, y, width, height, objectFit } = el;
  if (objectFit !== "contain" || naturalWidth <= 0 || naturalHeight <= 0) {
    return { x, y, width, height };
  }
  const targetRatio = width / height;
  const imgRatio = naturalWidth / naturalHeight;
  if (imgRatio > targetRatio) {
    const dh = width / imgRatio;
    return { x, y: y + (height - dh) / 2, width, height: dh };
  }
  const dw = height * imgRatio;
  return { x: x + (width - dw) / 2, y, width: dw, height };
}

// Рисует загруженную картинку с учётом objectFit (contain/cover/fill).
// Контент клипуется в bbox чтобы cover не вылез за рамку.
function drawReady(
  ctx: CanvasRenderingContext2D,
  el: IImageElement,
  img: HTMLImageElement,
): void {
  const { x, y, width, height, objectFit } = el;
  const iw = img.naturalWidth || width;
  const ih = img.naturalHeight || height;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();

  if (objectFit === "fill") {
    ctx.drawImage(img, x, y, width, height);
  } else if (objectFit === "contain") {
    const v = computeImageVisibleRect(el, iw, ih);
    ctx.drawImage(img, v.x, v.y, v.width, v.height);
  } else {
    // objectFit cover: dst-rect больше слота, видимое обрезается клипом.
    const targetRatio = width / height;
    const imgRatio = iw / ih;
    let dx = x;
    let dy = y;
    let dw = width;
    let dh = height;
    if (imgRatio > targetRatio) {
      dw = height * imgRatio;
      dx = x + (width - dw) / 2;
    } else {
      dh = width / imgRatio;
      dy = y + (height - dh) / 2;
    }
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  ctx.restore();
}

// Выбирает что рисовать в зависимости от status и состояния кеша.
// Кеш приходит через resolver (per-engine), не через модульный singleton.
export function drawImage(
  ctx: CanvasRenderingContext2D,
  el: IImageElement,
  resolver: IElementResolver,
): void {
  if (el.status === "pending") {
    drawPlaceholder(ctx, el, IMAGE_PLACEHOLDER_BORDER, "Loading…", true);
    return;
  }
  if (el.status === "failed") {
    drawPlaceholder(ctx, el, IMAGE_FAILED_BORDER, "Upload failed", false);
    return;
  }
  if (!el.src) {
    drawPlaceholder(ctx, el, IMAGE_PLACEHOLDER_BORDER, "Loading…", true);
    return;
  }
  const cache = resolver.getImageCache();
  if (!cache) {
    drawPlaceholder(ctx, el, IMAGE_PLACEHOLDER_BORDER, "Loading…", true);
    return;
  }
  if (cache.isFailed(el.src)) {
    drawPlaceholder(ctx, el, IMAGE_FAILED_BORDER, "Image unavailable", false);
    return;
  }
  const img = cache.get(el.src);
  if (!img) {
    drawPlaceholder(ctx, el, IMAGE_PLACEHOLDER_BORDER, "Loading…", true);
    return;
  }
  drawReady(ctx, el, img);
}

// Hit-test картинки: попадание точки в её прямоугольник.
export function hitTestImage(
  el: IImageElement,
  worldX: number,
  worldY: number,
  _resolver: IElementResolver,
): boolean {
  return rectContains(el.x, el.y, el.width, el.height, worldX, worldY);
}

// Пересечение прямоугольника картинки с rect-запросом.
export function intersectsRectImage(
  el: IImageElement,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  _resolver: IElementResolver,
): boolean {
  return rectIntersects(el.x, el.y, el.width, el.height, minX, minY, maxX, maxY);
}
