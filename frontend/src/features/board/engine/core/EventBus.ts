type TGenericListener = (data: unknown) => void;

// Типизированная pub/sub-шина для именованных событий. Generic-параметр TEvents
// мапит имя события на тип payload-а: EventBus<{ tick: number; ready: void }>.
// Подписка возвращает функцию отписки.
export class EventBus<TEvents> {
  private readonly listeners = new Map<keyof TEvents, Set<TGenericListener>>();

  // Подписывается на событие. Возвращает функцию отписки.
  on<E extends keyof TEvents>(
    event: E,
    listener: (data: TEvents[E]) => void,
  ): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    const wrapped = listener as TGenericListener;
    set.add(wrapped);
    return () => {
      set?.delete(wrapped);
    };
  }

  // Уведомляет всех подписчиков события.
  emit<E extends keyof TEvents>(event: E, data: TEvents[E]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const listener of set) {
      (listener as (data: TEvents[E]) => void)(data);
    }
  }

  // Удаляет всех подписчиков всех событий. Используется при destroy владельца.
  clear(): void {
    this.listeners.clear();
  }
}
