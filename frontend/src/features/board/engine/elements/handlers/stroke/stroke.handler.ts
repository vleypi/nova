import type { IStrokeElement } from "@engine/types";
import { registerHandler } from "@engine/elements/element-registry";
import type { IElementHandler } from "@engine/elements/interfaces/element-handler";
import { drawStroke } from "@engine/utils/stroke";
import { hitTestStroke, intersectsRectStroke } from "./stroke.hit";
import {
  cloneStroke,
  takeStrokeSnapshot,
  restoreStrokeSnapshot,
  applyStrokeMove,
  applyStrokeResize,
  computeStrokeBbox,
} from "./stroke.snapshot";

// Фасад: собирает handler из подмодулей и регистрирует под типом "stroke".
const handler: IElementHandler<IStrokeElement> = {
  draw: (ctx, el) => drawStroke(ctx, el),
  hitTest: hitTestStroke,
  intersectsRect: intersectsRectStroke,
  clone: cloneStroke,
  takeSnapshot: takeStrokeSnapshot,
  restoreSnapshot: restoreStrokeSnapshot,
  applyMove: applyStrokeMove,
  applyResize: applyStrokeResize,
  computeBbox: computeStrokeBbox,
};

registerHandler("stroke", handler as IElementHandler);
