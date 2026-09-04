import type { Camera } from "@engine/core/Camera";
import type { Commands } from "@engine/core/Commands";
import type { ContainerRect } from "@engine/core/ContainerRect";
import type { ElementStore } from "@engine/core/ElementStore";
import type { InputRouter } from "@engine/input/InputRouter";
import type { BoardRenderer } from "@engine/renderer/BoardRenderer";
import type { SelectionManager } from "@engine/selection/SelectionManager";
import type {
  IElement,
  IImageElement,
  IPoint,
  THistoryEntry,
} from "@engine/types";
import type { ImageUploader } from "@engine/image/ImageUploader";
import { getHandler } from "@engine/elements/element-registry";
import { isEditingText } from "@engine/utils/dom-focus";
import {
  compressImage,
  ImageCompressorError,
} from "@engine/image/ImageCompressor";
import {
  PASTE_OFFSET,
  PASTE_MAX_SIZE_BYTES,
  PASTE_MIME_WHITELIST,
  PASTE_IMAGE_MAX_DIM,
  PASTE_DEBOUNCE_MS,
  PASTE_WINDOW_MS,
  PASTE_WINDOW_LIMIT,
  BOARD_CLIPBOARD_MIME,
  BOARD_CLIPBOARD_VERSION,
} from "@/features/board/constants/board.constant";

interface IBoardClipboardPayload {
  version: number;
  elements: IElement[];
}

export interface IPasteHandlerDeps {
  container: HTMLDivElement;
  containerRect: ContainerRect;
  camera: Camera;
  store: ElementStore;
  selection: SelectionManager;
  renderer: BoardRenderer;
  input: InputRouter;
  commands: Commands;
  pushHistory: (entry: THistoryEntry) => void;
  uploader: ImageUploader;
  boardId: string;
  userId: string;
  onToast: (msg: string) => void;
}

// Обработчик clipboard: copy/paste board-элементов через кастомный MIME
// и paste картинок из буфера с компрессией и аплоадом. Защищён rate-limit'ом.
export class PasteHandler {
  private deps: IPasteHandlerDeps;
  private boundPaste: (e: ClipboardEvent) => void;
  private boundCopy: (e: ClipboardEvent) => void;
  private lastAcceptedPasteAt = 0;
  private acceptedPasteTimestamps: number[] = [];

  constructor(deps: IPasteHandlerDeps) {
    this.deps = deps;
    this.boundPaste = this.onPaste.bind(this);
    this.boundCopy = this.onCopy.bind(this);
  }

  attach(): void {
    document.addEventListener("paste", this.boundPaste, { capture: true });
    document.addEventListener("copy", this.boundCopy, { capture: true });
  }

  detach(): void {
    document.removeEventListener("paste", this.boundPaste, {
      capture: true,
    } as EventListenerOptions);
    document.removeEventListener("copy", this.boundCopy, {
      capture: true,
    } as EventListenerOptions);
  }

  // Сериализует выделенные элементы в clipboard как JSON. Игнорируется при
  // фокусе в текстовом редакторе (там работает обычный copy текста).
  private onCopy(e: ClipboardEvent): void {
    if (isEditingText(e.target)) return;
    // Если пользователь выделил ТЕКСТ на странице (например ответ AI в чате или
    // любой другой текст) — не перехватываем copy. Иначе вместо текста в буфер
    // уходит "<N board elements>". Перехват только когда текстового выделения нет
    // и выбраны элементы доски.
    const textSel = typeof window !== "undefined" ? window.getSelection?.() : null;
    if (textSel && !textSel.isCollapsed && textSel.toString().trim().length > 0) {
      return;
    }
    if (this.deps.selection.selectedIds.size === 0) return;

    const selectedIds = this.deps.selection.selectedIds;
    const elements = this.deps.store
      .getAll()
      .filter((el) => selectedIds.has(el.id));
    if (elements.length === 0) return;

    const payload: IBoardClipboardPayload = {
      version: BOARD_CLIPBOARD_VERSION,
      elements,
    };

    e.preventDefault();
    e.clipboardData?.setData(BOARD_CLIPBOARD_MIME, JSON.stringify(payload));
    e.clipboardData?.setData(
      "text/plain",
      `<${elements.length} board element${elements.length === 1 ? "" : "s"}>`,
    );
  }

  // Решает что вставлять: наш JSON, картинку или ничего.
  private onPaste(e: ClipboardEvent): void {
    if (isEditingText(e.target)) return;
    const data = e.clipboardData;
    if (!data) return;

    const hasBoardJson = data.getData(BOARD_CLIPBOARD_MIME).length > 0;
    const hasImage = !hasBoardJson && this.findImageBlob(data) !== null;
    if (!hasBoardJson && !hasImage) return;

    e.preventDefault();
    if (!this.checkPasteRateLimit()) return;

    if (hasBoardJson) {
      this.pasteBoardElementsFromJson(data.getData(BOARD_CLIPBOARD_MIME));
      return;
    }
    const imageBlob = this.findImageBlob(data);
    if (imageBlob) {
      void this.handleImageBlob(imageBlob);
    }
  }

  // Парсит JSON и проверяет версию формата. Битые/устаревшие данные молча игнорируются.
  private pasteBoardElementsFromJson(json: string): void {
    let parsed: IBoardClipboardPayload;
    try {
      parsed = JSON.parse(json);
    } catch {
      return;
    }
    if (!parsed || parsed.version !== BOARD_CLIPBOARD_VERSION) return;
    if (!Array.isArray(parsed.elements) || parsed.elements.length === 0) return;

    this.pasteBoardElements(parsed.elements);
  }

  // Клонирует элементы со сдвигом, добавляет в store, выделяет, пушит в историю.
  // Незнакомые типы (например из новой версии приложения) пропускаются.
  private pasteBoardElements(elements: IElement[]): void {
    const clones: IElement[] = [];
    for (const el of elements) {
      let handler;
      try {
        handler = getHandler(el.type);
      } catch {
        continue;
      }
      const clone = handler.clone(
        el,
        PASTE_OFFSET,
        PASTE_OFFSET,
        this.deps.store,
      ) as IElement;
      clone.userId = this.deps.userId;
      clone.boardId = this.deps.boardId;
      clone.createdAt = Date.now();
      clone.bbox = undefined;
      handler.computeBbox(clone, this.deps.store);
      clones.push(clone);
    }

    if (clones.length === 0) return;

    this.deps.commands.createElementsAsPaste(clones);
    this.deps.selection.replace(new Set(clones.map((clone) => clone.id)));
  }

  // Ищет в DataTransfer первый файл с разрешённым MIME-типом.
  private findImageBlob(data: DataTransfer): Blob | null {
    const items = data.items;
    if (!items) return null;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file" && PASTE_MIME_WHITELIST.has(item.type)) {
        const file = item.getAsFile();
        if (file) return file;
      }
    }
    return null;
  }

  // Полный путь paste картинки: validate, compress, decode, hash, создание элемента, аплоад.
  private async handleImageBlob(rawBlob: Blob): Promise<void> {
    if (!this.validateImageBlob(rawBlob)) return;

    let blob: Blob;
    try {
      blob = await compressImage(rawBlob);
    } catch (err) {
      this.deps.onToast(
        err instanceof ImageCompressorError
          ? err.message
          : "Could not process image",
      );
      return;
    }

    const dims = await this.decodeImageDimensions(blob);
    if (!dims) return;

    const sha = await PasteHandler.sha256Hex(blob);
    const pos =
      this.deps.input.getLastPointerWorld(this.deps.camera) ??
      this.viewportCenter();
    const el = this.buildImageElement(blob, sha, pos, dims);

    getHandler(el.type).computeBbox(el, this.deps.store);
    this.deps.commands.createElement(el);
    this.deps.selection.replace(new Set([el.id]));

    void this.deps.uploader.upload(blob, el);
  }

  // Проверяет MIME и размер. Показывает toast и возвращает false при ошибке.
  private validateImageBlob(blob: Blob): boolean {
    if (!PASTE_MIME_WHITELIST.has(blob.type)) {
      this.deps.onToast("Unsupported image format");
      return false;
    }
    if (blob.size <= 0 || blob.size > PASTE_MAX_SIZE_BYTES) {
      this.deps.onToast(
        `Image too large (max ${PASTE_MAX_SIZE_BYTES / 1024 / 1024} MB)`,
      );
      return false;
    }
    return true;
  }

  // Декодирует blob чтобы узнать размеры. Toast при ошибке.
  private async decodeImageDimensions(
    blob: Blob,
  ): Promise<{ width: number; height: number } | null> {
    try {
      const bitmap = await createImageBitmap(blob);
      const dims = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return dims;
    } catch {
      this.deps.onToast("Could not decode image");
      return null;
    }
  }

  // Строит IImageElement в статусе pending. Размеры на доске масштабируются до MAX_DIM.
  private buildImageElement(
    blob: Blob,
    sha: string,
    pos: IPoint,
    dims: { width: number; height: number },
  ): IImageElement {
    const [w, h] = PasteHandler.scaleToMax(
      dims.width,
      dims.height,
      PASTE_IMAGE_MAX_DIM,
    );
    return {
      id: crypto.randomUUID(),
      type: "image",
      userId: this.deps.userId,
      boardId: this.deps.boardId,
      createdAt: Date.now(),
      x: pos.x - w / 2,
      y: pos.y - h / 2,
      width: w,
      height: h,
      mime: blob.type,
      sha256: sha,
      status: "pending",
      src: null,
      assetId: null,
      objectFit: "contain",
    };
  }

  // Центр видимого канваса в мировых координатах. Fallback когда курсор покинул контейнер.
  private viewportCenter(): IPoint {
    const rect = this.deps.containerRect.get();
    const { wx, wy } = this.deps.camera.screenToWorld(
      rect.width / 2,
      rect.height / 2,
    );
    return { x: wx, y: wy };
  }

  // Двухуровневый rate-limit: дебаунс между paste и потолок за окно.
  private checkPasteRateLimit(): boolean {
    const now = performance.now();
    if (now - this.lastAcceptedPasteAt < PASTE_DEBOUNCE_MS) {
      this.deps.onToast("Paste too fast, slow down");
      return false;
    }
    const cutoff = now - PASTE_WINDOW_MS;
    this.acceptedPasteTimestamps = this.acceptedPasteTimestamps.filter(
      (ts) => ts > cutoff,
    );
    if (this.acceptedPasteTimestamps.length >= PASTE_WINDOW_LIMIT) {
      this.deps.onToast(`Paste limit: ${PASTE_WINDOW_LIMIT} per minute`);
      return false;
    }
    this.lastAcceptedPasteAt = now;
    this.acceptedPasteTimestamps.push(now);
    return true;
  }

  // Считает SHA-256 в hex от содержимого blob. Используется как идентификатор картинки.
  private static async sha256Hex(blob: Blob): Promise<string> {
    const buf = await blob.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buf);
    const arr = new Uint8Array(digest);
    return Array.from(arr)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  // Уменьшает (w, h) пропорционально, чтобы наибольшая сторона не превышала max.
  private static scaleToMax(
    w: number,
    h: number,
    max: number,
  ): [number, number] {
    const m = Math.max(w, h);
    if (m <= max) return [w, h];
    const k = max / m;
    return [Math.round(w * k), Math.round(h * k)];
  }
}
