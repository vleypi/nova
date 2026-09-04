import { IElement } from "@engine/types";
import { getHandler } from "@engine/elements/element-registry";
import {
  IEditableElementHandler,
  IEditableDefaults,
  isEditableHandler,
} from "@engine/elements/interfaces/editable-element-handler";
import { BaseTool, IToolDeps } from "./BaseTool";

// Базовый класс для tools, создающих и редактирующих один тип элемента.
// Наследники задают elementType и getDefaults; клик открывает редактор по
// существующему элементу или создаёт пустой и открывает на нём редактор.
export abstract class EditableElementTool extends BaseTool {
  // Прокидывает зависимости в BaseTool без дополнительной логики.
  constructor(deps: IToolDeps) {
    super(deps);
  }

  // Тип создаваемого элемента; задаётся наследником.
  protected abstract readonly elementType: IElement["type"];

  // Дефолтные параметры нового элемента без boardId; задаётся наследником.
  protected abstract getDefaults(): Omit<IEditableDefaults, "boardId">;

  // CSS-курсор инструмента над канвасом; наследник может переопределить.
  protected get cursor(): string {
    return "text";
  }

  // Устанавливает курсор инструмента при активации.
  onActivate(): void {
    this.container.style.cursor = this.cursor;
  }

  // Сбрасывает курсор контейнера при деактивации инструмента.
  onDeactivate(): void {
    this.container.style.cursor = "";
  }

  // Левый клик: либо открыть редактор существующего элемента, либо создать новый.
  onDown(event: PointerEvent): boolean {
    if (event.button !== 0) return false;
    const world = this.screenToWorld(event.clientX, event.clientY);
    const handler = this.getEditableHandler();

    const hit = this.findHitElement(world);
    if (hit) {
      this.openEdit(hit);
      return true;
    }
    const createEmpty = handler.createEmpty;
    if (!createEmpty) {
      throw new Error(
        `Handler "${this.elementType}" не поддерживает click-to-create (createEmpty)`,
      );
    }
    const defaults: IEditableDefaults = {
      ...this.getDefaults(),
      boardId: this.boardId,
    };
    const empty = createEmpty(world.x, world.y, defaults);
    this.openEdit(empty);
    return true;
  }

  // Движение указателя в этом инструменте не используется.
  onMove(_event: PointerEvent): void {}

  // Отпускание указателя в этом инструменте не используется.
  onUp(_event: PointerEvent): void {}

  // Возвращает editable-обработчик для elementType, иначе бросает ошибку.
  private getEditableHandler(): IEditableElementHandler {
    const handler = getHandler(this.elementType);
    if (!isEditableHandler(handler)) {
      throw new Error(`Handler for "${this.elementType}" is not editable`);
    }
    return handler;
  }

  // Ищет верхний элемент нужного типа под точкой мира; null если ничего нет.
  private findHitElement(world: { x: number; y: number }): IElement | null {
    const elements = this.store.getAll();
    const handler = this.getEditableHandler();
    for (let i = elements.length - 1; i >= 0; i--) {
      const element = elements[i];
      if (
        element.type === this.elementType &&
        handler.hitTest(element, world.x, world.y, this.store)
      ) {
        return element;
      }
    }
    return null;
  }
}
