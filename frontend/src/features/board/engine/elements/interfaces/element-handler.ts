import type { IElement, IStrokeBbox } from "@engine/types";
import type { ImageCache } from "@engine/image/ImageCache";

// Минимальный read-only интерфейс для функций, которым нужен доступ к элементам по id
// и к per-engine ресурсам отрисовки (например ImageCache). ElementStore реализует
// контракт; handlers получают resolver, чтобы не зависеть напрямую от полного store.
export interface IElementResolver {
  getById(id: string): IElement | undefined;
  // Кеш картинок текущего engine. Возвращает null если ещё не назначен или нет картинок.
  getImageCache(): ImageCache | null;
}

// Контракт обработчика конкретного типа элемента.
// Реализуется в handlers/ для stroke, image, text, sticky, connector.
export interface IElementHandler<T extends IElement = IElement> {
  draw(ctx: CanvasRenderingContext2D, el: T, resolver: IElementResolver): void;
  hitTest(
    el: T,
    worldX: number,
    worldY: number,
    resolver: IElementResolver,
  ): boolean;
  intersectsRect(
    el: T,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    resolver: IElementResolver,
  ): boolean;
  clone(el: T, offsetX: number, offsetY: number, resolver: IElementResolver): T;
  takeSnapshot(el: T): unknown;
  restoreSnapshot(el: T, snapshot: unknown): void;
  applyMove(el: T, snapshot: unknown, dx: number, dy: number): void;
  applyResize(
    el: T,
    snapshot: unknown,
    anchorX: number,
    anchorY: number,
    scaleX: number,
    scaleY: number,
    avgScale: number,
  ): void;
  computeBbox(el: T, resolver: IElementResolver): IStrokeBbox;
}
