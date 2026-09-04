import { Camera } from "@engine/core/Camera";
import { ICamera } from "@engine/types";

const CAMERA_SAVE_DEBOUNCE_MS = 500;

// Сохраняет и восстанавливает позицию камеры в localStorage с дебаунсом.
// Per-board ключ в namespace nova: чтобы не пересекаться с другими приложениями.
export class CameraPersistence {
  private camera: Camera;
  private storageKey: string;
  private unsubscribe: (() => void) | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(camera: Camera, boardId: string) {
    this.camera = camera;
    this.storageKey = `nova:board:${boardId}:camera`;
  }

  // Загружает сохранённую позицию или центрирует камеру, если ничего не было.
  // Должна вызываться до attach: иначе первый notify запишет только что прочитанное значение обратно.
  restore(): void {
    const saved = this.load();
    if (saved) this.camera.copyFrom(saved);
    else this.camera.centerView();
  }

  // Подписывается на изменения камеры. Каждый notify планирует дебаунс-запись в storage.
  attach(): void {
    this.unsubscribe = this.camera.subscribe(() => this.scheduleSave());
  }

  // Отписывается, отменяет ожидающую запись и финально сохраняет последний снимок —
  // чтобы при смене доски или закрытии вкладки не потерять только что сделанный pan/zoom.
  detach(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.save();
  }

  private scheduleSave(): void {
    if (this.saveTimer !== null) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.save();
    }, CAMERA_SAVE_DEBOUNCE_MS);
  }

  // Молча игнорирует ошибки: приватный режим, заполненная квота, отключённый storage
  // не должны блокировать работу доски.
  private save(): void {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(
        this.storageKey,
        JSON.stringify(this.camera.snapshot()),
      );
    } catch {
      // ignore
    }
  }

  private load(): ICamera | null {
    if (typeof localStorage === "undefined") return null;
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed === "object" &&
        typeof parsed.x === "number" &&
        typeof parsed.y === "number" &&
        typeof parsed.zoom === "number"
      ) {
        return { x: parsed.x, y: parsed.y, zoom: parsed.zoom };
      }
      return null;
    } catch {
      return null;
    }
  }
}
