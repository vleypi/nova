import type { IStickyElement } from "@engine/types";
import { registerHandler } from "@engine/elements/element-registry";
import type { IElementHandler } from "@engine/elements/interfaces/element-handler";
import { IEditableElementHandler } from "@engine/elements/interfaces/editable-element-handler";
import { drawSticky, hitTestSticky, intersectsRectSticky } from "./sticky.draw";
import { computeStickyBbox } from "./sticky.bbox";
import {
  cloneSticky,
  takeStickySnapshot,
  restoreStickySnapshot,
  applyStickyMove,
  applyStickyResize,
} from "./sticky.snapshot";
import {
  getEditableContentSticky,
  applyEditedContentSticky,
  getEditingBoundsSticky,
  createEmptySticky,
  shouldRecordEditSticky,
} from "./sticky.editable";

// Фасад: собирает editable-handler из подмодулей и регистрирует под типом "sticky".
const handler: IEditableElementHandler<IStickyElement> = {
  draw: drawSticky,
  hitTest: hitTestSticky,
  intersectsRect: intersectsRectSticky,
  computeBbox: computeStickyBbox,
  clone: cloneSticky,
  takeSnapshot: takeStickySnapshot,
  restoreSnapshot: restoreStickySnapshot,
  applyMove: applyStickyMove,
  applyResize: applyStickyResize,
  getEditableContent: getEditableContentSticky,
  applyEditedContent: applyEditedContentSticky,
  getEditingBounds: getEditingBoundsSticky,
  createEmpty: createEmptySticky,
  shouldRecordEdit: shouldRecordEditSticky,
};

registerHandler("sticky", handler as IElementHandler);
