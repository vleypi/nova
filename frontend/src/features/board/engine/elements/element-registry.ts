import type { IElementHandler } from "@engine/elements/interfaces/element-handler";
import type { ElementStore } from "@engine/core/ElementStore";

// Глобальный реестр handlers. Заполняется side-effect-импортами из register-handlers.ts
// при загрузке движка. Один handler на тип элемента.
const handlers = new Map<string, IElementHandler>();

// Хуки, которые handler-ы регистрируют для per-engine инициализации:
// например, подписка на store.onElementRemoved для очистки своих кешей.
// Возвращает функцию отписки, которая вызывается при destroy движка.
type TStoreInitHook = (store: ElementStore) => () => void;
const storeInitHooks: TStoreInitHook[] = [];

// Регистрирует handler для типа элемента. Перезатирает существующий.
export function registerHandler(type: string, handler: IElementHandler): void {
  handlers.set(type, handler);
}

// Регистрирует хук, который вызовется при создании движка и получит его store.
// Hook возвращает функцию отписки, которая будет вызвана при destroy движка.
// Например, text-handler чистит свой link-area-cache при удалении элементов.
export function registerStoreInitHook(hook: TStoreInitHook): void {
  storeInitHooks.push(hook);
}

// Возвращает handler по типу элемента. Бросает если не зарегистрирован.
export function getHandler(type: string): IElementHandler {
  const handler = handlers.get(type);
  if (!handler) {
    throw new Error(`No element handler registered for type "${type}"`);
  }
  return handler;
}

// Запускает все зарегистрированные store-init хуки и возвращает единую функцию
// отписки. Зовётся из BoardEngine один раз при инициализации.
export function initHandlersForStore(store: ElementStore): () => void {
  const cleanups = storeInitHooks.map((hook) => hook(store));
  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}
