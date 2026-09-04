import type { IShapeElement } from "@engine/types";
import { registerHandler } from "@engine/elements/element-registry";
import type { IElementHandler } from "@engine/elements/interfaces/element-handler";
import type { IEditableElementHandler } from "@engine/elements/interfaces/editable-element-handler";
import { drawShape } from "./shape.draw";
import { hitTestShape, intersectsRectShape } from "./shape.hit";
import { computeShapeBbox } from "./shape.bbox";
import {
  cloneShape,
  takeShapeSnapshot,
  restoreShapeSnapshot,
  applyShapeMove,
  applyShapeResize,
} from "./shape.snapshot";
import {
  getEditableContentShape,
  applyEditedContentShape,
  getEditingBoundsShape,
  shouldRecordEditShape,
  drawDuringEditShape,
} from "./shape.editable";

// Фасад: собирает editable-handler из подмодулей и регистрирует под типом "shape".
// createEmpty не задан: ShapeTool создаёт через drag-out, click через EditableElementTool неприменим.
const handler: IEditableElementHandler<IShapeElement> = {
  draw: drawShape,
  hitTest: hitTestShape,
  intersectsRect: intersectsRectShape,
  clone: cloneShape,
  takeSnapshot: takeShapeSnapshot,
  restoreSnapshot: restoreShapeSnapshot,
  applyMove: applyShapeMove,
  applyResize: applyShapeResize,
  computeBbox: computeShapeBbox,
  getEditableContent: getEditableContentShape,
  applyEditedContent: applyEditedContentShape,
  getEditingBounds: getEditingBoundsShape,
  shouldRecordEdit: shouldRecordEditShape,
  drawDuringEdit: drawDuringEditShape,
};

registerHandler("shape", handler as IElementHandler);
