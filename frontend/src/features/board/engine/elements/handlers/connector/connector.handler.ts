import type { IConnectorElement } from "@engine/types";
import { registerHandler } from "@engine/elements/element-registry";
import type { IElementHandler } from "@engine/elements/interfaces/element-handler";
import { drawConnector } from "./connector.draw";
import { hitTestConnector, intersectsRectConnector } from "./connector.hit";
import { computeConnectorBbox } from "./connector.bbox";
import {
  applyConnectorMove,
  applyConnectorResize,
  cloneConnector,
  restoreConnectorSnapshot,
  takeConnectorSnapshot,
} from "./connector.snapshot";

// Фасад: собирает handler из подмодулей и регистрирует под типом "connector".
// Каждое поле делегирует в отдельную функцию для удобства поиска и unit-теста.
const handler: IElementHandler<IConnectorElement> = {
  draw: drawConnector,
  hitTest: hitTestConnector,
  intersectsRect: intersectsRectConnector,
  computeBbox: computeConnectorBbox,
  clone: cloneConnector,
  takeSnapshot: takeConnectorSnapshot,
  restoreSnapshot: restoreConnectorSnapshot,
  applyMove: applyConnectorMove,
  applyResize: applyConnectorResize,
};

registerHandler("connector", handler as IElementHandler);
