import { IInputHandler } from "@engine/input/InputRouter";
import { INPUT_PRIORITY } from "@engine/input/priorities";
import { BaseTool } from "@engine/tools/BaseTool";

const DEFAULT_TOOL = "select";
const DEFAULT_PEN_TOOL = "pencil";
const PEN_GROUP_TOOL = "pen";
const PRIMARY_MOUSE_BUTTON = 0;

// Менеджер инструментов доски: регистрация, переключение, проксирование pointer-событий.
export class ToolManager implements IInputHandler {
  readonly name = "ToolManager";
  readonly priority = INPUT_PRIORITY.TOOL;

  private tools = new Map<string, BaseTool>();
  private activeTool: string = DEFAULT_TOOL;
  private activePenTool: string = DEFAULT_PEN_TOOL;
  private engagedTool: string | null = null;

  // Регистрирует инструмент под заданным именем.
  register(name: string, tool: BaseTool): void {
    this.tools.set(name, tool);
  }

  // Возвращает инструмент по имени или undefined.
  getTool(name: string): BaseTool | undefined {
    return this.tools.get(name);
  }

  // Перебор всех зарегистрированных инструментов. Используется для broadcast-вызовов
  // методов, которые поддерживают только некоторые тулы (например setArmedColor).
  allTools(): IterableIterator<BaseTool> {
    return this.tools.values();
  }

  // Возвращает фактически активный ключ инструмента с учётом подгруппы pen.
  getResolvedTool(): string {
    return this.activeTool === PEN_GROUP_TOOL
      ? this.activePenTool
      : this.activeTool;
  }

  // Переключает активный инструмент верхнего уровня.
  setActiveTool(tool: string): void {
    this.swapResolvedTool(() => {
      this.activeTool = tool;
    });
  }

  // Переключает активный pen-инструмент внутри группы pen.
  setPenTool(tool: string): void {
    this.swapResolvedTool(() => {
      this.activePenTool = tool;
    });
  }

  // Возвращает имя активного инструмента верхнего уровня.
  getActiveTool(): string {
    return this.activeTool;
  }

  // Возвращает имя активного pen-инструмента.
  getActivePenTool(): string {
    return this.activePenTool;
  }

  // True если какой-то инструмент сейчас захватил жест (между onDown и onUp/onCancel).
  // PointerPan и другие observer'ы могут спросить это, чтобы не мешать активному gesture.
  isEngaged(): boolean {
    return this.engagedTool !== null;
  }

  // Проксирует pointerdown на разрешённый инструмент. Возврат true фиксирует захват.
  // Игнорирует concurrent pointerdown пока активен engagedTool, иначе на touch второй палец
  // ломает первый жест (например, EraserTool сбрасывает erasedDuringDrag).
  onDown(event: PointerEvent): boolean | void {
    if (event.button !== PRIMARY_MOUSE_BUTTON) return;
    if (this.engagedTool) return false;
    const key = this.getResolvedTool();
    const tool = this.tools.get(key);
    if (!tool) return;
    const claimed = tool.onDown(event);
    if (claimed === true) {
      this.engagedTool = key;
      return true;
    }
    return false;
  }

  // Проксирует pointermove на захваченный инструмент или вызывает onHoverMove.
  onMove(event: PointerEvent): void {
    if (this.engagedTool) {
      this.tools.get(this.engagedTool)?.onMove(event);
      return;
    }
    const key = this.getResolvedTool();
    this.tools.get(key)?.onHoverMove?.(event);
  }

  // Проксирует pointerup на захваченный инструмент и снимает захват.
  onUp(event: PointerEvent): void {
    this.releaseEngagedTool(event);
  }

  // Проксирует pointercancel на захваченный инструмент и снимает захват.
  onCancel(event: PointerEvent): void {
    this.releaseEngagedTool(event);
  }

  // Завершает жест на захваченном инструменте, если он есть.
  private releaseEngagedTool(event: PointerEvent): void {
    if (!this.engagedTool) return;
    this.tools.get(this.engagedTool)?.onUp(event);
    this.engagedTool = null;
  }

  // Вызывает onDeactivate/onActivate, если разрешённый инструмент действительно сменился.
  private swapResolvedTool(applyChange: () => void): void {
    const previousKey = this.getResolvedTool();
    applyChange();
    const nextKey = this.getResolvedTool();
    if (previousKey === nextKey) return;
    this.tools.get(previousKey)?.onDeactivate?.();
    this.tools.get(nextKey)?.onActivate?.();
  }
}
