import { IElement } from "@engine/types";
import { refreshConnectorBboxes } from "@engine/utils/connector-refresh";
import { BaseTool } from "./BaseTool";

// Инструмент ластика. Стирает элементы под курсором и рисует след.
export class EraserTool extends BaseTool {
  private isErasing = false;
  private erasedDuringDrag: IElement[] = [];

  // Начало стирания: сброс состояния, первая точка следа и попытка стереть.
  onDown(event: PointerEvent): boolean {
    this.isErasing = true;
    this.erasedDuringDrag = [];
    this.processEraseAt(event);
    return true;
  }

  // Продолжение стирания при движении курсора с зажатой кнопкой.
  onMove(event: PointerEvent): void {
    if (!this.isErasing) return;
    this.processEraseAt(event);
  }

  // Завершение жеста: фиксируем удалённые элементы в истории одной записью.
  onUp(_event: PointerEvent): void {
    if (!this.isErasing) return;
    this.isErasing = false;
    if (this.erasedDuringDrag.length > 0) {
      this.pushHistory({ type: "erase", elements: this.erasedDuringDrag });
      this.erasedDuringDrag = [];
    }
  }

  // Добавляет точку следа, стирает элемент под курсором и перерисовывает кадр.
  private processEraseAt(event: PointerEvent): void {
    const rect = this.containerRect.get();
    const world = this.screenToWorld(event.clientX, event.clientY);
    this.renderer.addEraserTrailPoint({
      sx: event.clientX - rect.left,
      sy: event.clientY - rect.top,
      t: Date.now(),
    });
    const erased = this.store.eraseAt(world.x, world.y);
    if (erased) {
      this.selection.unselect(erased.id);
      this.erasedDuringDrag.push(erased);
      // Коннекторы с анкорами на стёртый элемент должны переиндексироваться,
      // иначе их bbox в RBush останется как у удалённой точки привязки.
      refreshConnectorBboxes(this.store, new Set([erased.id]));
      this.rerender();
      return;
    }
    this.renderer.renderFrame();
  }

  // Полная перерисовка: пересборка буфера элементов и рендер кадра.
  private rerender(): void {
    this.renderer.rebuildBuffer();
    this.renderer.renderFrame();
  }
}
