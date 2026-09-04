import {
  MIN_TEXT_FONT_SIZE,
  TEXT_RESIZE_MIN_INITIAL_DIST,
  TEXT_RESIZE_MIN_SCALE,
} from "@/features/board/constants/board.constant";
import { Camera } from "@engine/core/Camera";
import { ContainerRect } from "@engine/core/ContainerRect";
import { attachCornerHandles } from "@engine/editor/editor.dom";
import { clientToWorld, getWorldDims } from "@engine/editor/editor.position";

// Ссылки на DOM-узлы редактора, нужные для измерения размеров при ресайзе.
export interface IEditorResizeStateRefs {
  measurer: HTMLSpanElement | null;
  editable: HTMLDivElement | null;
  measureDiv: HTMLDivElement | null;
}

// Зависимости EditorResize: контекст редактора и колбэки управления состоянием.
export interface IEditorResizeDeps {
  container: HTMLDivElement;
  containerRect: ContainerRect;
  camera: Camera;
  getRefs: () => IEditorResizeStateRefs;
  getWorldPos: () => { x: number; y: number };
  setWorldPos: (pos: { x: number; y: number }) => void;
  getFontSize: () => number;
  setFontSize: (size: number) => void;
  setSuppressBlur: (suppress: boolean) => void;
  requestSync: () => void;
  focusEditable: () => void;
}

// Внутреннее состояние одного жеста ресайза от pointerdown до pointerup.
interface IResizeState {
  active: boolean;
  handleIdx: number;
  anchorWorld: { x: number; y: number };
  initialDist: number;
  initialFontSize: number;
  initialDims: { w: number; h: number };
}

// Угловые ручки имеют индексы: 0 top-left, 1 top-right, 2 bottom-left, 3 bottom-right.
const HANDLE_TOP_LEFT = 0;
const HANDLE_TOP_RIGHT = 1;
const HANDLE_BOTTOM_LEFT = 2;

// Управляет масштабированием inline-редактора текста за угловые ручки рамки.
export class EditorResize {
  private readonly deps: IEditorResizeDeps;
  private readonly state: IResizeState = {
    active: false,
    handleIdx: 0,
    anchorWorld: { x: 0, y: 0 },
    initialDist: TEXT_RESIZE_MIN_INITIAL_DIST,
    initialFontSize: MIN_TEXT_FONT_SIZE,
    initialDims: { w: 0, h: 0 },
  };

  constructor(deps: IEditorResizeDeps) {
    this.deps = deps;
  }

  // Создаёт четыре угловые ручки в указанной рамке и подключает обработчики ресайза.
  attachCornerHandles(frame: HTMLDivElement): void {
    attachCornerHandles(frame, {
      onStart: (info) =>
        this.onResizeStart(info.handleIdx, info.clientX, info.clientY),
      onMove: (clientX, clientY) => this.onResizeMove(clientX, clientY),
      onEnd: () => this.onResizeEnd(),
    });
  }

  // Прерывает текущий ресайз. Если в момент detach была активная сессия — гарантирует
  // cleanup (snimaет suppressBlur, возвращает фокус). Без этого после destroy() во время
  // drag editor оставался бы с suppressBlur=true и pointer-capture у удалённого handle.
  detach(): void {
    if (this.state.active) {
      this.onResizeEnd();
    }
  }

  private onResizeStart(
    handleIdx: number,
    clientX: number,
    clientY: number,
  ): void {
    this.deps.setSuppressBlur(true);
    this.state.active = true;
    this.state.handleIdx = handleIdx;
    this.state.initialFontSize = this.deps.getFontSize();
    this.state.initialDims = this.measureWorldDims();

    const dims = this.state.initialDims;
    const worldPos = this.deps.getWorldPos();
    const isLeft = this.isLeftHandle(handleIdx);
    const isTop = this.isTopHandle(handleIdx);
    this.state.anchorWorld = {
      x: isLeft ? worldPos.x + dims.w : worldPos.x,
      y: isTop ? worldPos.y + dims.h : worldPos.y,
    };

    const pointerWorld = this.toWorld(clientX, clientY);
    this.state.initialDist = Math.max(
      TEXT_RESIZE_MIN_INITIAL_DIST,
      Math.hypot(
        pointerWorld.x - this.state.anchorWorld.x,
        pointerWorld.y - this.state.anchorWorld.y,
      ),
    );
  }

  private onResizeMove(clientX: number, clientY: number): void {
    if (!this.state.active) return;
    const pointerWorld = this.toWorld(clientX, clientY);
    const newDist = Math.hypot(
      pointerWorld.x - this.state.anchorWorld.x,
      pointerWorld.y - this.state.anchorWorld.y,
    );
    const scale = Math.max(
      TEXT_RESIZE_MIN_SCALE,
      newDist / this.state.initialDist,
    );

    this.deps.setFontSize(
      Math.max(MIN_TEXT_FONT_SIZE, this.state.initialFontSize * scale),
    );

    const newWidth = this.state.initialDims.w * scale;
    const newHeight = this.state.initialDims.h * scale;
    const anchor = this.state.anchorWorld;
    const isLeft = this.isLeftHandle(this.state.handleIdx);
    const isTop = this.isTopHandle(this.state.handleIdx);
    this.deps.setWorldPos({
      x: isLeft ? anchor.x - newWidth : anchor.x,
      y: isTop ? anchor.y - newHeight : anchor.y,
    });
    this.deps.requestSync();
  }

  private onResizeEnd(): void {
    if (!this.state.active) return;
    this.state.active = false;
    this.deps.setSuppressBlur(false);
    this.deps.focusEditable();
  }

  private toWorld(clientX: number, clientY: number): { x: number; y: number } {
    return clientToWorld(
      this.deps.containerRect.get(),
      this.deps.camera,
      clientX,
      clientY,
    );
  }

  private measureWorldDims(): { w: number; h: number } {
    const refs = this.deps.getRefs();
    return getWorldDims(
      {
        measurer: refs.measurer,
        editable: refs.editable,
        measureDiv: refs.measureDiv,
      },
      this.deps.getFontSize(),
      this.deps.camera,
    );
  }

  private isLeftHandle(handleIdx: number): boolean {
    return handleIdx === HANDLE_TOP_LEFT || handleIdx === HANDLE_BOTTOM_LEFT;
  }

  private isTopHandle(handleIdx: number): boolean {
    return handleIdx === HANDLE_TOP_LEFT || handleIdx === HANDLE_TOP_RIGHT;
  }
}
