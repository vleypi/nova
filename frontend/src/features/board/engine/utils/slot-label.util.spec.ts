import { generateSlotLabel } from "./slot-label.util";
import type { IElement } from "@engine/types";
import type { ElementStore } from "@engine/core/ElementStore";

const makeStore = (elements: Record<string, Partial<IElement>>): ElementStore => {
  return {
    getById: (id: string) =>
      elements[id] ? ({ id, ...elements[id] } as IElement) : undefined,
  } as unknown as ElementStore;
};

describe("generateSlotLabel", () => {
  it("returns dash for empty array", () => {
    const store = makeStore({});
    expect(generateSlotLabel([], store)).toBe("—");
  });

  it("returns count label for multiple ids", () => {
    const store = makeStore({});
    expect(generateSlotLabel(["a", "b", "c"], store)).toBe("3 элементов");
  });

  it("returns trimmed text for single element with short text", () => {
    const store = makeStore({
      a: { type: "text", text: "Привет" } as Partial<IElement>,
    });
    expect(generateSlotLabel(["a"], store)).toBe("Привет");
  });

  it("truncates long text to 24 chars + ellipsis", () => {
    const longText = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const store = makeStore({
      a: { type: "text", text: longText } as Partial<IElement>,
    });
    expect(generateSlotLabel(["a"], store)).toBe(longText.slice(0, 24) + "…");
  });

  it("falls back to type label when text is only whitespace", () => {
    const store = makeStore({
      a: { type: "shape", text: "   " } as Partial<IElement>,
    });
    expect(generateSlotLabel(["a"], store)).toBe("Фигура");
  });

  it("returns type label for sticky with no text", () => {
    const store = makeStore({
      a: { type: "sticky" } as Partial<IElement>,
    });
    expect(generateSlotLabel(["a"], store)).toBe("Стикер");
  });

  it("returns 'элемент' for unknown type with no text", () => {
    const store = makeStore({
      a: { type: "weird-type" } as unknown as Partial<IElement>,
    });
    expect(generateSlotLabel(["a"], store)).toBe("элемент");
  });

  it("returns 'элемент' when id not in store", () => {
    const store = makeStore({});
    expect(generateSlotLabel(["nope"], store)).toBe("элемент");
  });
});
