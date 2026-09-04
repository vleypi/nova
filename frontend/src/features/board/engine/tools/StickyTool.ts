import {
  DEFAULT_STICKY_SIZE,
  STICKY_DEFAULT_COLOR,
  STICKY_DEFAULT_FONT_SIZE,
  TEXT_FONT_FAMILY,
} from "@/features/board/constants/board.constant";
import { IEditableDefaults } from "@engine/elements/interfaces/editable-element-handler";
import { EditableElementTool } from "@engine/tools/EditableElementTool";

// Инструмент создания стикеров. Расширяет EditableElementTool, добавляя
// поддержку выбранного цвета заливки (armedColor).
export class StickyTool extends EditableElementTool {
  private armedColor: string = STICKY_DEFAULT_COLOR;

  protected readonly elementType = "sticky" as const;

  protected get cursor() {
    return "cell";
  }

  // Устанавливает цвет заливки для следующего создаваемого стикера.
  setArmedColor(color: string): void {
    this.armedColor = color;
  }

  // Возвращает текущий вооружённый цвет заливки.
  getArmedColor(): string {
    return this.armedColor;
  }

  // Возвращает параметры по умолчанию для нового стикера.
  protected getDefaults(): Omit<IEditableDefaults, "boardId"> {
    return {
      fontSize: STICKY_DEFAULT_FONT_SIZE,
      color: STICKY_DEFAULT_COLOR,
      fontFamily: TEXT_FONT_FAMILY,
      textAlign: "center",
      initialSize: { width: DEFAULT_STICKY_SIZE, height: DEFAULT_STICKY_SIZE },
      fill: this.armedColor,
    };
  }
}
