import type { ITextElement } from "@engine/types";
import {
  registerHandler,
  registerStoreInitHook,
} from "@engine/elements/element-registry";
import type { IElementHandler } from "@engine/elements/interfaces/element-handler";
import { IEditableElementHandler } from "@engine/elements/interfaces/editable-element-handler";
import { drawText, linkAreaCache } from "./text.draw";
import { hitTestText, intersectsRectText } from "./text.hit";
import { computeTextBbox } from "./text.bbox";
import {
  cloneText,
  takeTextSnapshot,
  restoreTextSnapshot,
  applyTextMove,
  applyTextResize,
} from "./text.snapshot";
import {
  getEditableContentText,
  applyEditedContentText,
  getEditingBoundsText,
  createEmptyText,
  applyCommitPositionText,
  TEXT_DELETE_ON_EMPTY,
} from "./text.editable";

// Фасад: собирает editable-handler из подмодулей и регистрирует под типом "text".
const handler: IEditableElementHandler<ITextElement> = {
  draw: drawText,
  hitTest: hitTestText,
  intersectsRect: intersectsRectText,
  computeBbox: computeTextBbox,
  clone: cloneText,
  takeSnapshot: takeTextSnapshot,
  restoreSnapshot: restoreTextSnapshot,
  applyMove: applyTextMove,
  applyResize: applyTextResize,
  getEditableContent: getEditableContentText,
  applyEditedContent: applyEditedContentText,
  getEditingBounds: getEditingBoundsText,
  createEmpty: createEmptyText,
  shouldDeleteOnEmpty: TEXT_DELETE_ON_EMPTY,
  applyCommitPosition: applyCommitPositionText,
};

registerHandler("text", handler as IElementHandler);

// При создании движка подписываемся на removal-уведомления его store, чтобы
// чистить кеш link-зон. Hook сам возвращает функцию отписки, которую BoardEngine
// вызовет при destroy. Без этого link-cache рос бы вечно при паттерне создания-удаления текстов.
registerStoreInitHook((store) =>
  store.onElementRemoved((el) => linkAreaCache.delete(el.id)),
);

// Re-exports text-специфичных функций для других модулей.
// Generic rich-text утилиты (htmlToLines, layoutRichLines, типы) живут в
// shared/rich-text-layout и оттуда же импортируются напрямую.
export { drawVisualLines, getLinkAtWorldPoint } from "./text.draw";
export type { IDrawOpts, ILinkArea } from "./text.draw";
