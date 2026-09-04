// Кэширует bounding rect контейнера движка. Инвалидируется по ResizeObserver
// и любому window scroll-событию в capture-фазе — это покрывает изменение
// макета (открытие сайдбара, скролл страницы, ресайз окна), но не покрывает
// программные style-сдвиги ancestor'ов без resize. Для тех случаев caller'у
// нужно явно вызвать invalidate().
//
// Заменяет повторяющиеся container.getBoundingClientRect()-вызовы в
// pointer-обработчиках: каждый из них форсил layout flush. С кэшом — один раз
// на изменение макета вместо одного на каждое pointermove.
export class ContainerRect {
  private container: HTMLElement;
  private cached: DOMRect | null = null;
  private resizeObserver: ResizeObserver;
  private boundInvalidate: () => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.boundInvalidate = () => {
      this.cached = null;
    };
    this.resizeObserver = new ResizeObserver(this.boundInvalidate);
    this.resizeObserver.observe(container);
    // Capture-фаза ловит scroll-event любого scrollable-ancestor (включая window
    // и внутренние scroll-контейнеры в layout-обвязке вокруг доски).
    window.addEventListener("scroll", this.boundInvalidate, true);
    window.addEventListener("resize", this.boundInvalidate);
  }

  // Возвращает кэшированный rect, измеряя при необходимости.
  get(): DOMRect {
    if (!this.cached) this.cached = this.container.getBoundingClientRect();
    return this.cached;
  }

  // Принудительно сбрасывает кэш. Нужно если макет изменился из-за программной
  // мутации, которая не триггерит ResizeObserver/scroll/resize.
  invalidate(): void {
    this.cached = null;
  }

  destroy(): void {
    this.resizeObserver.disconnect();
    window.removeEventListener("scroll", this.boundInvalidate, true);
    window.removeEventListener("resize", this.boundInvalidate);
    this.cached = null;
  }
}
