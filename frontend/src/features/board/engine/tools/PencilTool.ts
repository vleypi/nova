import { IElement, IStroke } from "@engine/types";
import { computeBbox } from "@engine/utils/bbox";
import {
  DEFAULT_STROKE_COLOR,
  DEFAULT_STROKE_WIDTH,
} from "@/features/board/constants/board.constant";
import { BaseTool } from "./BaseTool";

// Инструмент карандаша: собирает точки штриха и фиксирует элемент в store.
export class PencilTool extends BaseTool {
  private currentStroke: IStroke | null = null;
  private elementId = "";

  // Начало штриха: создаём новый stroke с первой точкой и отдаём его рендереру.
  onDown(event: PointerEvent): boolean {
    this.elementId = crypto.randomUUID();
    this.currentStroke = {
      points: [this.screenToWorld(event.clientX, event.clientY)],
      color: DEFAULT_STROKE_COLOR,
      width: DEFAULT_STROKE_WIDTH,
    };
    this.renderer.setCurrentStroke(this.currentStroke);
    return true;
  }

  // Движение указателя: добавляем накопленные coalesced-точки в текущий штрих.
  // Рендерер видит мутацию по той же ссылке, поэтому достаточно перепланировать кадр.
  onMove(event: PointerEvent): void {
    if (!this.currentStroke) return;
    const events: PointerEvent[] =
      typeof event.getCoalescedEvents === "function"
        ? event.getCoalescedEvents()
        : [event];
    for (const coalescedEvent of events) {
      this.currentStroke.points.push(
        this.screenToWorld(coalescedEvent.clientX, coalescedEvent.clientY),
      );
    }
    this.renderer.scheduleRender();
  }

  // Конец штриха: фиксируем элемент в store и истории, очищаем состояние.
  onUp(_event: PointerEvent): void {
    if (!this.currentStroke) return;
    if (this.currentStroke.points.length >= 1) {
      this.commitStroke(this.currentStroke);
    }
    this.currentStroke = null;
    this.renderer.setCurrentStroke(null);
  }

  // Сохранение завершённого штриха как элемента доски.
  private commitStroke(stroke: IStroke): void {
    stroke.bbox = computeBbox(stroke.points, stroke.width);
    const element: IElement = {
      ...stroke,
      id: this.elementId,
      type: "stroke",
      userId: "",
      boardId: this.boardId,
      createdAt: Date.now(),
    };
    this.commands.createElement(element);
  }
}
