import { Camera } from "@engine/core/Camera";
import { IPoint } from "@engine/types";

// Активный участник цепочки ввода. Сортируется по priority (выше — раньше).
// Если onDown возвращает true, событие считается консумленным и следующие
// handlers его не получают. Также Router захватывает pointer на consumed-ивенте.
export interface IInputHandler {
  readonly name: string;
  readonly priority: number;
  onDown?(e: PointerEvent): boolean | void;
  onMove?(e: PointerEvent): void;
  onUp?(e: PointerEvent): void;
  onCancel?(e: PointerEvent): void;
}

// Пассивный наблюдатель: получает все события до и независимо от handlers.
// Не может консумить, не имеет priority. Для побочных эффектов (например, эмит курсора).
export interface IInputObserver {
  readonly name: string;
  onDown?(e: PointerEvent): void;
  onMove?(e: PointerEvent): void;
  onUp?(e: PointerEvent): void;
  onCancel?(e: PointerEvent): void;
}

// Роутер pointer-событий контейнера. Раздаёт события observers и handlers,
// поддерживает consume-семантику для handlers и pointer-capture после consume.
export class InputRouter {
  private container: HTMLElement | null = null;
  private handlers: IInputHandler[] = [];
  private observers: IInputObserver[] = [];
  private lastPointerClient: IPoint | null = null;

  private readonly boundDown: (e: PointerEvent) => void;
  private readonly boundMove: (e: PointerEvent) => void;
  private readonly boundUp: (e: PointerEvent) => void;
  private readonly boundCancel: (e: PointerEvent) => void;
  private readonly boundPointerLeave: () => void;

  constructor() {
    this.boundDown = this.dispatchDown.bind(this);
    this.boundMove = this.dispatchMove.bind(this);
    this.boundUp = this.dispatchUp.bind(this);
    this.boundCancel = this.dispatchCancel.bind(this);
    this.boundPointerLeave = () => {
      this.lastPointerClient = null;
    };
  }

  // Регистрирует handler. Возвращает функцию отписки. Список ресортируется по priority.
  register(h: IInputHandler): () => void {
    this.handlers.push(h);
    this.handlers.sort((a, b) => b.priority - a.priority);
    return () => {
      const idx = this.handlers.indexOf(h);
      if (idx !== -1) this.handlers.splice(idx, 1);
    };
  }

  // Регистрирует observer. Возвращает функцию отписки.
  observe(o: IInputObserver): () => void {
    this.observers.push(o);
    return () => {
      const idx = this.observers.indexOf(o);
      if (idx !== -1) this.observers.splice(idx, 1);
    };
  }

  // Подписывается на pointer-события контейнера.
  attach(container: HTMLElement): void {
    this.container = container;
    container.addEventListener("pointerdown", this.boundDown);
    container.addEventListener("pointermove", this.boundMove);
    container.addEventListener("pointerup", this.boundUp);
    container.addEventListener("pointercancel", this.boundCancel);
    container.addEventListener("pointerleave", this.boundPointerLeave);
  }

  detach(): void {
    if (!this.container) return;
    this.container.removeEventListener("pointerdown", this.boundDown);
    this.container.removeEventListener("pointermove", this.boundMove);
    this.container.removeEventListener("pointerup", this.boundUp);
    this.container.removeEventListener("pointercancel", this.boundCancel);
    this.container.removeEventListener("pointerleave", this.boundPointerLeave);
    this.container = null;
  }

  // Последняя позиция курсора в мировых координатах. null если курсор покинул контейнер.
  // Используется для операций, которым нужна точка курсора без свежего события (например paste).
  getLastPointerWorld(camera: Camera): IPoint | null {
    if (!this.lastPointerClient || !this.container) return null;
    const rect = this.container.getBoundingClientRect();
    const screenX = this.lastPointerClient.x - rect.left;
    const screenY = this.lastPointerClient.y - rect.top;
    const { wx, wy } = camera.screenToWorld(screenX, screenY);
    return { x: wx, y: wy };
  }

  // Сначала уведомляем observers, потом handlers по убыванию priority.
  // Первый handler, чей onDown вернул true, консумит событие и забирает pointer-capture.
  private dispatchDown(e: PointerEvent): void {
    for (const observer of this.observers) observer.onDown?.(e);
    for (const handler of this.handlers) {
      if (handler.onDown?.(e) === true) {
        try {
          // setPointerCapture может бросить, если pointerId уже не активен.
          this.container?.setPointerCapture(e.pointerId);
        } catch {}
        return;
      }
    }
  }

  // Move рассылается всем без консумирования. Заодно запоминаем последнюю позицию.
  private dispatchMove(e: PointerEvent): void {
    this.lastPointerClient = { x: e.clientX, y: e.clientY };
    for (const observer of this.observers) observer.onMove?.(e);
    for (const handler of this.handlers) handler.onMove?.(e);
  }

  // Up и Cancel также рассылаются всем подряд.
  private dispatchUp(e: PointerEvent): void {
    for (const observer of this.observers) observer.onUp?.(e);
    for (const handler of this.handlers) handler.onUp?.(e);
  }

  private dispatchCancel(e: PointerEvent): void {
    for (const observer of this.observers) observer.onCancel?.(e);
    for (const handler of this.handlers) handler.onCancel?.(e);
  }
}
