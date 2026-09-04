import {
  DEFAULT_TEXT_COLOR,
  DEFAULT_TEXT_FONT_SIZE,
  TEXT_FONT_FAMILY,
} from "@/features/board/constants/board.constant";
import { IEditableDefaults } from "@engine/elements/interfaces/editable-element-handler";
import { EditableElementTool } from "@engine/tools/EditableElementTool";

// Инструмент создания текстового элемента на доске.
export class TextTool extends EditableElementTool {
  protected readonly elementType = "text" as const;

  protected get cursor() {
    return "text";
  }

  protected getDefaults(): Omit<IEditableDefaults, "boardId"> {
    return {
      fontSize: DEFAULT_TEXT_FONT_SIZE,
      color: DEFAULT_TEXT_COLOR,
      fontFamily: TEXT_FONT_FAMILY,
      textAlign: "left",
    };
  }
}
