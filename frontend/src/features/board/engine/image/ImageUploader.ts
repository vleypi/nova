import type { Commands } from "@engine/core/Commands";
import type { ElementStore } from "@engine/core/ElementStore";
import type { BoardRenderer } from "@engine/renderer/BoardRenderer";
import type { IImageElement } from "@engine/types";
import type { BoardSync } from "@engine/sync/BoardSync";
import { getHandler } from "@engine/elements/element-registry";
import {
  IMAGE_UPLOAD_OVERALL_TIMEOUT_MS,
  IMAGE_UPLOAD_BACKOFFS,
  IMAGE_UPLOAD_FAILED_CLEANUP_DELAY_MS,
} from "@/features/board/constants/board.constant";
import {
  presignAsset,
  confirmAsset,
} from "@/features/board/services/assets.service";

export interface IImageUploaderDeps {
  sync: BoardSync;
  store: ElementStore;
  renderer: BoardRenderer;
  commands: Commands;
  boardId: string;
}

// Загружает картинку на сервер с ретраями и общим дедлайном.
// При провале помечает элемент failed и удаляет с доски через 5 секунд.
export class ImageUploader {
  private deps: IImageUploaderDeps;

  constructor(deps: IImageUploaderDeps) {
    this.deps = deps;
  }

  // Загружает одну картинку. Если такая уже на сервере (по sha256), PUT пропускается.
  async upload(blob: Blob, element: IImageElement): Promise<void> {
    const deadline = performance.now() + IMAGE_UPLOAD_OVERALL_TIMEOUT_MS;
    try {
      const presign = await ImageUploader.withRetries(
        () =>
          presignAsset({
            boardId: this.deps.boardId,
            mime: element.mime,
            sizeBytes: blob.size,
            sha256: element.sha256,
            width: element.width,
            height: element.height,
          }),
        deadline,
      );

      if (!presign.duplicate) {
        await ImageUploader.withRetries(
          () => this.putBlob(presign.uploadUrl, blob, element.mime),
          deadline,
        );
      }

      const confirm = await ImageUploader.withRetries(
        () => confirmAsset(presign.assetId),
        deadline,
      );

      this.applyPatch(element, {
        status: "ready",
        src: confirm.proxyUrl,
        assetId: presign.assetId,
      });
    } catch (err) {
      console.warn("[ImageUploader] upload failed", err);
      this.applyPatch(element, { status: "failed" });
      setTimeout(
        () => this.deleteElement(element),
        IMAGE_UPLOAD_FAILED_CLEANUP_DELAY_MS,
      );
    }
  }

  // PUT raw-blob по presigned URL с правильным Content-Type.
  private async putBlob(
    uploadUrl: string,
    blob: Blob,
    mime: string,
  ): Promise<void> {
    const res = await fetch(uploadUrl, {
      method: "PUT",
      body: blob,
      headers: { "Content-Type": mime },
    });
    if (!res.ok) {
      throw new Error(`PUT ${res.status}`);
    }
  }

  // Применяет partial-патч к image-элементу и пушит "edit"-запись истории.
  private applyPatch(
    element: IImageElement,
    patch: Partial<IImageElement>,
  ): void {
    const snapshot = getHandler(element.type).takeSnapshot(element);
    const oldData: Record<string, unknown> = { ...(snapshot as object) };
    const newData: Record<string, unknown> = {
      ...(snapshot as object),
      ...patch,
    };
    this.deps.commands.updateElement(
      element.id,
      patch as Record<string, unknown>,
      oldData,
      newData,
    );
  }

  // Удаляет элемент с доски и эмитит "erase" в историю для синка.
  private deleteElement(element: IImageElement): void {
    if (!this.deps.store.has(element.id)) return;
    this.deps.commands.deleteElements([element]);
  }

  // Повторяет fn с задержками из IMAGE_UPLOAD_BACKOFFS до успеха или дедлайна.
  private static async withRetries<T>(
    fn: () => Promise<T>,
    deadline: number,
  ): Promise<T> {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= IMAGE_UPLOAD_BACKOFFS.length; attempt++) {
      if (performance.now() > deadline) break;
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        if (attempt < IMAGE_UPLOAD_BACKOFFS.length) {
          await ImageUploader.sleep(IMAGE_UPLOAD_BACKOFFS[attempt]);
        }
      }
    }
    throw lastErr;
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise((res) => setTimeout(res, ms));
  }
}
