import { findContainingDiv, getCurrentDiv } from "./editor.text-utils";

export interface ITextEditorCommandsCallbacks {
  notifyChange: () => void;
  onListStateChange?: (type: "bullet" | "number" | null) => void;
}

// Команды форматирования inline-редактора: списки, вставка, ссылки, цвет.
export class TextEditorCommands {
  // Последний валидный range В ПРЕДЕЛАХ editable. Обновляется через document
  // selectionchange. Нужен потому что клик по toolbar-кнопке может снять фокус
  // с editable и коллапсировать window.getSelection() в курсор кнопки — а нам
  // нужна оригинальная multi-line selection пользователя (для toggleList и т.п.).
  private lastEditableRange: Range | null = null;
  private readonly boundSelectionChange: () => void;

  constructor(
    private readonly editable: HTMLDivElement,
    private readonly callbacks: ITextEditorCommandsCallbacks,
  ) {
    this.boundSelectionChange = () => this.captureRangeIfInEditable();
    document.addEventListener("selectionchange", this.boundSelectionChange);
  }

  // Снимает selectionchange-листенер. Вызывается из TextEditorOverlay.destroy.
  destroy(): void {
    document.removeEventListener("selectionchange", this.boundSelectionChange);
    this.lastEditableRange = null;
  }

  private captureRangeIfInEditable(): void {
    // Захватываем только пока editable в фокусе. Когда фокус уходит на toolbar-кнопку,
    // браузер фаерит selectionchange с collapsed-range у последнего cursor-position —
    // если мы это запишем, multi-line selection (Ctrl+A) будет затёрта на курсор,
    // и toggleList применит bullet только к одной строке.
    if (document.activeElement !== this.editable) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (
      this.editable.contains(range.startContainer) &&
      this.editable.contains(range.endContainer)
    ) {
      this.lastEditableRange = range.cloneRange();
    }
  }

  // Пересчитывает индекс/маркер у пунктов списков. Зеркалит логику canvas
  // (rich-text-layout.ts + text.draw.ts): counter per `${type}:${level}`,
  // сбрасывается на целевой `${type}:${level}` когда prevType отличается.
  // Это даёт согласованную нумерацию между editor и canvas для смешанных
  // и вложенных списков (например 1.→a.→1. на разных уровнях).
  //
  // Заполняет:
  //  - data-li-index = "1", "2", ... для type="number" (CSS показывает через attr())
  //  - data-li-marker = "a", "b", ... для type="letter"
  //  - bullet не нуждается в per-item data (CSS статический "• ")
  updateListIndices(): void {
    const counters: Record<string, number> = {};
    let prevType: string | undefined;
    for (const child of Array.from(this.editable.children)) {
      const div = child as HTMLDivElement;
      const listType = div.dataset.liType;
      const listLevel = parseInt(div.dataset.liLevel ?? "0", 10) || 0;

      if (listType === "number" && prevType !== "number") {
        counters[`number:${listLevel}`] = 0;
      }
      if (listType === "letter" && prevType !== "letter") {
        counters[`letter:${listLevel}`] = 0;
      }
      prevType = listType;

      if (!listType) {
        delete div.dataset.liIndex;
        delete div.dataset.liMarker;
        continue;
      }

      const key = `${listType}:${listLevel}`;
      counters[key] = (counters[key] ?? 0) + 1;
      const indexZeroBased = counters[key] - 1;

      if (listType === "number") {
        div.dataset.liIndex = String(counters[key]);
        delete div.dataset.liMarker;
      } else if (listType === "letter") {
        div.dataset.liMarker = String.fromCharCode(97 + (indexZeroBased % 26));
        delete div.dataset.liIndex;
      } else {
        delete div.dataset.liIndex;
        delete div.dataset.liMarker;
      }
    }
  }

  // Обрабатывает Enter: выходит из пустого пункта списка или продолжает список.
  handleEnter(): void {
    const curDiv = getCurrentDiv(this.editable);
    const liType = curDiv?.dataset?.liType;
    const liLevel = curDiv?.dataset?.liLevel;
    const divEmpty = !!curDiv && (curDiv.textContent ?? "") === "";
    if (liType && curDiv && divEmpty) {
      delete curDiv.dataset.liType;
      delete curDiv.dataset.liLevel;
      this.updateListIndices();
      this.callbacks.onListStateChange?.(null);
      this.callbacks.notifyChange();
      return;
    }
    document.execCommand("insertParagraph");
    if (liType || liLevel) {
      let newDiv = getCurrentDiv(this.editable) as HTMLDivElement | null;
      if (!newDiv || newDiv === curDiv) {
        const sib = curDiv?.nextElementSibling;
        newDiv = (sib?.tagName === "DIV" ? sib : null) as HTMLDivElement | null;
      }
      if (newDiv && newDiv !== curDiv) {
        if (liType) newDiv.dataset.liType = liType;
        if (liLevel) newDiv.dataset.liLevel = liLevel;
      }
    }
    this.updateListIndices();
    this.callbacks.notifyChange();
  }

  // Включает или выключает список заданного типа на всех строках, пересечённых
  // текущим выделением (а если выделения нет — на строке курсора).
  // Toggle-семантика: если ВСЕ затронутые строки уже имеют этот тип — снимаем
  // его со всех; иначе ставим тип на всех. Match-ит поведение word-processor'ов:
  // Ctrl+A → bullet даёт список из всех строк.
  //
  // ВАЖНО: НЕ зовём editable.focus() в начале — это коллапсит multi-line selection
  // в курсор. После применения возвращаем фокус для продолжения ввода.
  toggleList(type: "bullet" | "number"): void {
    const divs = this.collectSelectedDivs();
    if (divs.length === 0) return;
    const allHaveType = divs.every((d) => d.dataset.liType === type);
    for (const d of divs) {
      if (allHaveType) {
        delete d.dataset.liType;
        delete d.dataset.liLevel;
      } else {
        d.dataset.liType = type;
        d.dataset.liLevel = "0";
      }
    }
    this.updateListIndices();
    this.callbacks.notifyChange();
    this.editable.focus({ preventScroll: true });
  }

  // Собирает все top-level div'ы, которые пересекает текущий range. Если range
  // collapsed (курсор без выделения) — возвращает один div под курсором.
  // Если live window.getSelection() уехал за пределы editable (например, фокус
  // на toolbar-кнопке) — используем lastEditableRange как fallback.
  private collectSelectedDivs(): HTMLDivElement[] {
    const range = this.getEffectiveRange();
    if (!range) {
      const cur = getCurrentDiv(this.editable);
      return cur ? [cur] : [];
    }
    const startDiv = findContainingDiv(range.startContainer, this.editable);
    const endDiv = findContainingDiv(range.endContainer, this.editable);
    if (!startDiv) {
      const cur = getCurrentDiv(this.editable);
      return cur ? [cur] : [];
    }
    if (!endDiv || startDiv === endDiv) return [startDiv];
    const divs: HTMLDivElement[] = [];
    let cur: Element | null = startDiv;
    while (cur) {
      if (cur.tagName === "DIV") divs.push(cur as HTMLDivElement);
      if (cur === endDiv) break;
      cur = cur.nextElementSibling;
    }
    return divs;
  }

  // Эффективный range: live-selection если она внутри editable, иначе захваченная.
  private getEffectiveRange(): Range | null {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const live = sel.getRangeAt(0);
      if (
        this.editable.contains(live.startContainer) &&
        this.editable.contains(live.endContainer)
      ) {
        return live;
      }
    }
    return this.lastEditableRange;
  }

  // Вставляет plain text, разбивая многострочный текст по div-строкам.
  pasteText(text: string): void {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (!range.collapsed) range.deleteContents();
    const lines = text.split("\n");
    if (lines.length === 1) {
      document.execCommand("insertText", false, lines[0]);
      this.callbacks.notifyChange();
      return;
    }
    const curDiv = getCurrentDiv(this.editable);
    if (!curDiv) {
      this.callbacks.notifyChange();
      return;
    }
    const afterFragment = this.extractAfterFragment(curDiv, sel);
    if (lines[0]) curDiv.appendChild(document.createTextNode(lines[0]));
    if (!curDiv.textContent) curDiv.innerHTML = "<br>";
    let lastDiv: HTMLDivElement = curDiv;
    for (let i = 1; i < lines.length; i++) {
      const lineDiv = document.createElement("div");
      if (lines[i]) lineDiv.textContent = lines[i];
      else lineDiv.innerHTML = "<br>";
      lastDiv.after(lineDiv);
      lastDiv = lineDiv;
    }
    this.appendFragmentAndPlaceCaret(lastDiv, afterFragment, sel);
    this.callbacks.notifyChange();
  }

  // Вставляет санитизированный HTML, сохраняя структуру div-строк.
  pasteHtml(html: string): void {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (!range.collapsed) range.deleteContents();
    const temp = document.createElement("div");
    temp.innerHTML = html;
    const pastedDivs = Array.from(temp.querySelectorAll(":scope > div"));
    if (pastedDivs.length === 0) {
      document.execCommand("insertText", false, temp.textContent || "");
      this.callbacks.notifyChange();
      return;
    }
    const curDiv = getCurrentDiv(this.editable);
    if (!curDiv) {
      document.execCommand("insertText", false, temp.textContent || "");
      this.callbacks.notifyChange();
      return;
    }
    const afterFragment = this.extractAfterFragment(curDiv, sel);
    const firstDiv = pastedDivs[0];
    while (firstDiv.firstChild) curDiv.appendChild(firstDiv.firstChild);
    if (!curDiv.textContent && !curDiv.querySelector("br"))
      curDiv.innerHTML = "<br>";
    let lastDiv = curDiv as HTMLDivElement;
    for (let i = 1; i < pastedDivs.length; i++) {
      const newDiv = pastedDivs[i] as HTMLDivElement;
      lastDiv.after(newDiv);
      lastDiv = newDiv;
    }
    this.appendFragmentAndPlaceCaret(lastDiv, afterFragment, sel);
    this.callbacks.notifyChange();
  }

  // Вставляет ссылку: оборачивает выделенный текст или вставляет href как текст.
  insertLink(rawUrl: string, restoreRange: Range | null): void {
    const href = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    this.editable.focus({ preventScroll: true });
    const sel = window.getSelection();
    if (sel && restoreRange) {
      sel.removeAllRanges();
      sel.addRange(restoreRange);
    }
    const range = sel?.rangeCount ? sel.getRangeAt(0) : null;
    const selectedText = range ? range.toString() : "";
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.textContent = selectedText || href;
    if (range) {
      range.deleteContents();
      range.insertNode(anchor);
      if (anchor.parentNode === this.editable) {
        let nextSib = anchor.nextSibling;
        while (nextSib && (nextSib as Element).tagName !== "DIV")
          nextSib = nextSib.nextSibling;
        if (nextSib) {
          (nextSib as HTMLDivElement).insertBefore(anchor, nextSib.firstChild);
        } else {
          let prevSib = anchor.previousSibling;
          while (prevSib && (prevSib as Element).tagName !== "DIV")
            prevSib = prevSib.previousSibling;
          if (prevSib) (prevSib as HTMLDivElement).appendChild(anchor);
        }
      }
      const newRange = document.createRange();
      newRange.setStartAfter(anchor);
      newRange.collapse(true);
      sel!.removeAllRanges();
      sel!.addRange(newRange);
    }
    this.callbacks.notifyChange();
  }

  // Применяет цвет шрифта к текущему выделению.
  applyColor(color: string, restoreRange: Range | null): void {
    this.editable.focus({ preventScroll: true });
    this.restoreSelection(restoreRange);
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand("foreColor", false, color);
    this.callbacks.notifyChange();
  }

  // Применяет цвет фона (highlight) к текущему выделению.
  applyHighlight(color: string, restoreRange: Range | null): void {
    this.editable.focus({ preventScroll: true });
    this.restoreSelection(restoreRange);
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(
      "hiliteColor",
      false,
      color === "transparent" ? "inherit" : color,
    );
    this.callbacks.notifyChange();
  }

  private restoreSelection(range: Range | null): void {
    if (!range) return;
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }

  private extractAfterFragment(
    curDiv: HTMLDivElement,
    sel: Selection,
  ): DocumentFragment {
    const r = sel.getRangeAt(0);
    const afterRange = document.createRange();
    afterRange.selectNodeContents(curDiv);
    try {
      afterRange.setStart(r.startContainer, r.startOffset);
    } catch {}
    return afterRange.extractContents();
  }

  private appendFragmentAndPlaceCaret(
    lastDiv: HTMLDivElement,
    afterFragment: DocumentFragment,
    sel: Selection,
  ): void {
    const childCountBeforeAppend = lastDiv.childNodes.length;
    lastDiv.appendChild(afterFragment);
    if (!lastDiv.textContent && !lastDiv.querySelector("br"))
      lastDiv.innerHTML = "<br>";
    const newRange = document.createRange();
    if (childCountBeforeAppend > 0) {
      const lastPastedNode = lastDiv.childNodes[childCountBeforeAppend - 1];
      if (lastPastedNode.nodeType === Node.TEXT_NODE) {
        newRange.setStart(
          lastPastedNode,
          lastPastedNode.textContent?.length ?? 0,
        );
      } else {
        newRange.setStartAfter(lastPastedNode);
      }
    } else {
      newRange.setStart(lastDiv, 0);
    }
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
  }
}
