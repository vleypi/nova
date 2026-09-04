import type { IImageElement } from "@engine/types";
import { registerHandler } from "@engine/elements/element-registry";
import type { IElementHandler } from "@engine/elements/interfaces/element-handler";
import { drawImage, hitTestImage, intersectsRectImage } from "./image.draw";
import {
  cloneImage,
  takeImageSnapshot,
  restoreImageSnapshot,
  applyImageMove,
  applyImageResize,
  computeImageBbox,
} from "./image.snapshot";

// Фасад: собирает handler из подмодулей и регистрирует под типом "image".
const handler: IElementHandler<IImageElement> = {
  draw: drawImage,
  hitTest: hitTestImage,
  intersectsRect: intersectsRectImage,
  clone: cloneImage,
  takeSnapshot: takeImageSnapshot,
  restoreSnapshot: restoreImageSnapshot,
  applyMove: applyImageMove,
  applyResize: applyImageResize,
  computeBbox: computeImageBbox,
};

registerHandler("image", handler as IElementHandler);
