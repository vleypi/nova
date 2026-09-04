// Физические коды клавиш (event.code), которые при Ctrl/Meta пропускаем браузеру.
// event.code локаль-независим: Ctrl+Я (физическая Z на русской раскладке) даёт
// event.code === "KeyZ", а event.key === "я" → ловить через .key ломало undo для не-латинских раскладок.
const PASSTHROUGH_MODIFIER_CODES: ReadonlySet<string> = new Set([
  "KeyZ",
  "KeyY",
  "KeyC",
  "KeyX",
  "KeyV",
]);

// Колбэки событий редактируемой области текстового редактора.
export interface IEditorEventsCallbacks {
  onInput: () => void;
  onPointerDown: (event: PointerEvent) => void;
  onCancel: () => void;
  onEnter: () => void;
  onBlur: (event: FocusEvent) => void;
  onPaste: (event: ClipboardEvent) => void;
}

// Подписывается на события editable и возвращает функцию отписки.
// IME composition (русский с автозаменой, любой CJK через pinyin/IME) обрабатывается
// через compositionstart/end + event.isComposing guard в keydown:
//   - Enter во время composition подтверждает выбор IME, НЕ финализирует редактор
//   - onInput пропускается во время composition (промежуточные иероглифы не должны
//     триггерить updateListIndices / syncToCamera, иначе ввод тормозит и дёргается)
export function attachEditorEvents(
  editable: HTMLDivElement,
  callbacks: IEditorEventsCallbacks,
): () => void {
  let isComposing = false;

  const handleInput = (): void => {
    if (isComposing) return;
    callbacks.onInput();
  };

  const handleCompositionStart = (): void => {
    isComposing = true;
  };

  const handleCompositionEnd = (): void => {
    isComposing = false;
    // Финальный onInput после композиции, чтобы updateListIndices/sync подтянулись
    // к committed-варианту.
    callbacks.onInput();
  };

  const handlePointerDown = (event: PointerEvent): void => {
    callbacks.onPointerDown(event);
  };

  const handleKeyDown = (event: KeyboardEvent): void => {
    // event.isComposing === true пока IME-композиция активна; keyCode 229 — fallback
    // для старых Chrome/Safari, которые могут не выставить isComposing.
    if (event.isComposing || event.keyCode === 229) return;

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      callbacks.onCancel();
      return;
    }

    const hasModifier = event.ctrlKey || event.metaKey;
    if (hasModifier && PASSTHROUGH_MODIFIER_CODES.has(event.code)) {
      event.stopPropagation();
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      callbacks.onEnter();
      return;
    }
  };

  const handleBlur = (event: FocusEvent): void => {
    callbacks.onBlur(event);
  };

  const handlePaste = (event: ClipboardEvent): void => {
    callbacks.onPaste(event);
  };

  editable.addEventListener("input", handleInput);
  editable.addEventListener("compositionstart", handleCompositionStart);
  editable.addEventListener("compositionend", handleCompositionEnd);
  editable.addEventListener("pointerdown", handlePointerDown);
  editable.addEventListener("keydown", handleKeyDown);
  editable.addEventListener("blur", handleBlur);
  editable.addEventListener("paste", handlePaste);

  return () => {
    editable.removeEventListener("input", handleInput);
    editable.removeEventListener("compositionstart", handleCompositionStart);
    editable.removeEventListener("compositionend", handleCompositionEnd);
    editable.removeEventListener("pointerdown", handlePointerDown);
    editable.removeEventListener("keydown", handleKeyDown);
    editable.removeEventListener("blur", handleBlur);
    editable.removeEventListener("paste", handlePaste);
  };
}
