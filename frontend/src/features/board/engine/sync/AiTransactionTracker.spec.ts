import { AiTransactionTracker, bboxCenter } from "./AiTransactionTracker";
import type { IElement } from "@engine/types";

const makeShape = (overrides: Partial<IElement> = {}): IElement =>
  ({
    id: "el-1",
    type: "shape",
    userId: "user-1",
    boardId: "board-1",
    createdAt: 1_700_000_000_000,
    shapeKind: "rect",
    x: 100,
    y: 200,
    width: 60,
    height: 40,
    bbox: { minX: 100, minY: 200, maxX: 160, maxY: 240 },
    ...overrides,
  }) as unknown as IElement;

describe("AiTransactionTracker", () => {
  it("instantiates without crashing", () => {
    const t = new AiTransactionTracker();
    expect(t).toBeDefined();
  });

  it("bboxCenter computes center from bbox", () => {
    const el = makeShape();
    expect(bboxCenter(el)).toEqual({ x: 130, y: 220 });
  });

  describe("onElementChunk: create", () => {
    it("creates new tx state and records first element + center", () => {
      const t = new AiTransactionTracker();
      const el = makeShape({ id: "a" });
      const r = t.onElementChunk({
        txId: "tx-1",
        step: 0,
        op: "create",
        element: el,
      });
      expect(r.isFirstInTx).toBe(true);
      expect(r.firstCenter).toEqual({ x: 130, y: 220 });
      expect(r.snapshot.createdElementIds).toEqual(["a"]);
      expect(r.snapshot.totalSteps.created).toBe(1);
      expect(r.snapshot.hadEditOps).toBe(false);
    });

    it("appends subsequent creates and keeps first center", () => {
      const t = new AiTransactionTracker();
      const el1 = makeShape({
        id: "a",
        bbox: { minX: 100, minY: 200, maxX: 160, maxY: 240 },
      });
      const el2 = makeShape({
        id: "b",
        bbox: { minX: 500, minY: 500, maxX: 600, maxY: 600 },
      });
      t.onElementChunk({ txId: "tx-1", step: 0, op: "create", element: el1 });
      const r = t.onElementChunk({
        txId: "tx-1",
        step: 1,
        op: "create",
        element: el2,
      });
      expect(r.isFirstInTx).toBe(false);
      expect(r.firstCenter).toEqual({ x: 130, y: 220 });
      expect(r.snapshot.createdElementIds).toEqual(["a", "b"]);
      expect(r.snapshot.totalSteps.created).toBe(2);
    });
  });

  describe("onElementChunk: edit ops", () => {
    it("sets hadEditOps=true on update", () => {
      const t = new AiTransactionTracker();
      const r = t.onElementChunk({
        txId: "tx-2",
        step: 0,
        op: "update",
        elementId: "x",
        patch: { text: "y" },
      });
      expect(r.snapshot.hadEditOps).toBe(true);
      expect(r.snapshot.totalSteps.updated).toBe(1);
      expect(r.isFirstInTx).toBe(false);
    });

    it("sets hadEditOps=true on move", () => {
      const t = new AiTransactionTracker();
      const r = t.onElementChunk({
        txId: "tx-3",
        step: 0,
        op: "move",
        elementId: "x",
        patch: { x: 1, y: 2 },
      });
      expect(r.snapshot.hadEditOps).toBe(true);
      expect(r.snapshot.totalSteps.moved).toBe(1);
    });

    it("sets hadEditOps=true on delete", () => {
      const t = new AiTransactionTracker();
      const r = t.onElementChunk({
        txId: "tx-4",
        step: 0,
        op: "delete",
        elementId: "x",
      });
      expect(r.snapshot.hadEditOps).toBe(true);
      expect(r.snapshot.totalSteps.deleted).toBe(1);
    });

    it("create then update marks hadEditOps=true but keeps createdElementIds", () => {
      const t = new AiTransactionTracker();
      const el = makeShape({ id: "a" });
      t.onElementChunk({ txId: "tx-5", step: 0, op: "create", element: el });
      const r = t.onElementChunk({
        txId: "tx-5",
        step: 1,
        op: "update",
        elementId: "a",
        patch: { color: "#f00" },
      });
      expect(r.snapshot.hadEditOps).toBe(true);
      expect(r.snapshot.createdElementIds).toEqual(["a"]);
      expect(r.snapshot.totalSteps.created).toBe(1);
      expect(r.snapshot.totalSteps.updated).toBe(1);
    });
  });

  describe("onDone", () => {
    const makeDone = (
      txId: string,
      ok = true,
    ): import("@/features/board/services/ai.service").IAiDone => ({
      txId,
      ok,
      finalMessage: "",
      summary: { created: 0, updated: 0, moved: 0, deleted: 0 },
    });

    it("returns the tracked state and removes tx from active", () => {
      const t = new AiTransactionTracker();
      const el = makeShape({ id: "a" });
      t.onElementChunk({ txId: "tx-d1", step: 0, op: "create", element: el });
      const out = t.onDone(makeDone("tx-d1"));
      expect(out).not.toBeNull();
      expect(out!.createdElementIds).toEqual(["a"]);

      // Calling again should now return null (already removed).
      const out2 = t.onDone(makeDone("tx-d1"));
      expect(out2).toBeNull();
    });

    it("returns null if txId unknown", () => {
      const t = new AiTransactionTracker();
      const out = t.onDone(makeDone("tx-unknown"));
      expect(out).toBeNull();
    });

    it("returns snapshot even when ok=false (caller decides what to do)", () => {
      const t = new AiTransactionTracker();
      t.onElementChunk({
        txId: "tx-fail",
        step: 0,
        op: "create",
        element: makeShape({ id: "a" }),
      });
      const out = t.onDone(makeDone("tx-fail", false));
      expect(out).not.toBeNull();
      expect(out!.txId).toBe("tx-fail");
    });
  });
});
