// True если в данный момент пользователь редактирует текст: contenteditable, INPUT или TEXTAREA.
// Используется в KeyboardHandler чтобы не перехватывать Ctrl+Z во время инпута.
export function isEditingText(
  target: EventTarget | null = document.activeElement,
): boolean {
  if (!target || !(target instanceof Element)) return false;
  if (target.getAttribute("contenteditable") === "true") return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA";
}
