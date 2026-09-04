const mockEmit = jest.fn();
const mockOn = jest.fn();

jest.mock("./board-ws.service", () => ({
  __esModule: true,
  default: { emit: mockEmit, on: mockOn },
}));

import { aiService } from "./ai.service";

describe("AiService", () => {
  beforeEach(() => {
    mockEmit.mockReset();
    mockOn.mockReset();
    mockOn.mockReturnValue(jest.fn());
  });

  it("emitMessage → emit ai:message с нужными полями", () => {
    aiService.emitMessage("b-1", "нарисуй круг", [], { x: 0, y: 0, zoom: 1 });

    expect(mockEmit).toHaveBeenCalledWith("ai:message", {
      boardId: "b-1",
      message: "нарисуй круг",
      history: [],
      viewportHint: { x: 0, y: 0, zoom: 1 },
      contextSlots: undefined,
    });
  });

  it("emitMessage без необязательных аргументов → viewportHint и contextSlots = undefined", () => {
    aiService.emitMessage("b-2", "привет", []);

    expect(mockEmit).toHaveBeenCalledWith("ai:message", {
      boardId: "b-2",
      message: "привет",
      history: [],
      viewportHint: undefined,
      contextSlots: undefined,
    });
  });

  it("onChunkText → подписка на ai:chunk:text, возвращает unsubscribe", () => {
    const unsub = jest.fn();
    mockOn.mockReturnValueOnce(unsub);
    const cb = jest.fn();

    const result = aiService.onChunkText(cb);

    expect(mockOn).toHaveBeenCalledWith("ai:chunk:text", cb);
    expect(result).toBe(unsub);
  });

  it("onChunkElement → подписка на ai:chunk:element", () => {
    const cb = jest.fn();
    aiService.onChunkElement(cb);
    expect(mockOn).toHaveBeenCalledWith("ai:chunk:element", cb);
  });

  it("onChunkToolFailed → подписка на ai:chunk:tool_failed", () => {
    const cb = jest.fn();
    aiService.onChunkToolFailed(cb);
    expect(mockOn).toHaveBeenCalledWith("ai:chunk:tool_failed", cb);
  });

  it("onDone → подписка на ai:done", () => {
    const cb = jest.fn();
    aiService.onDone(cb);
    expect(mockOn).toHaveBeenCalledWith("ai:done", cb);
  });

  it("onError → подписка на ai:error", () => {
    const cb = jest.fn();
    aiService.onError(cb);
    expect(mockOn).toHaveBeenCalledWith("ai:error", cb);
  });
});
