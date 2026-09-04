jest.mock("socket.io-client", () => {
  function createSocket() {
    const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};
    const managerListeners: Record<
      string,
      Array<(...args: unknown[]) => void>
    > = {};
    let connected = false;
    const socket = {
      on: jest.fn((event: string, cb: (...args: unknown[]) => void) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(cb);
      }),
      off: jest.fn((event: string, cb: (...args: unknown[]) => void) => {
        listeners[event] = (listeners[event] ?? []).filter((c) => c !== cb);
      }),
      emit: jest.fn(),
      disconnect: jest.fn(() => {
        connected = false;
      }),
      get connected() {
        return connected;
      },
      io: {
        on: jest.fn((event: string, cb: (...args: unknown[]) => void) => {
          if (!managerListeners[event]) managerListeners[event] = [];
          managerListeners[event].push(cb);
        }),
        off: jest.fn((event: string, cb: (...args: unknown[]) => void) => {
          managerListeners[event] = (managerListeners[event] ?? []).filter(
            (c) => c !== cb,
          );
        }),
      },
      __setConnected: (v: boolean) => {
        connected = v;
      },
      __getListeners: () => listeners,
      __getManagerListeners: () => managerListeners,
    };
    return socket;
  }

  const ioMock = jest.fn(() => {
    const socket = createSocket();
    (ioMock as unknown as { __last: ReturnType<typeof createSocket> }).__last =
      socket;
    return socket;
  });

  return { io: ioMock };
});

type MockSocket = {
  on: jest.Mock;
  off: jest.Mock;
  emit: jest.Mock;
  disconnect: jest.Mock;
  connected: boolean;
  io: { on: jest.Mock; off: jest.Mock };
  __setConnected: (v: boolean) => void;
  __getListeners: () => Record<string, Array<(...args: unknown[]) => void>>;
  __getManagerListeners: () => Record<
    string,
    Array<(...args: unknown[]) => void>
  >;
};

// Каждый тест запрашивает свежий singleton сервиса + свежий мок io.
const loadService = () => {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ioMod = require("socket.io-client") as {
    io: jest.Mock & { __last?: MockSocket };
  };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const svcMod = require("./board-ws.service") as typeof import("./board-ws.service");
  return {
    svc: svcMod.boardWsService,
    getMock: () => ioMod.io.__last as MockSocket,
    ioFn: ioMod.io,
  };
};

describe("BoardWsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("connect / disconnect refCount", () => {
    it("переиспользует сокет при повторных connect (один io() вызов)", () => {
      const { svc, ioFn } = loadService();
      const s1 = svc.connect();
      const s2 = svc.connect();
      expect(s1).toBe(s2);
      expect(ioFn).toHaveBeenCalledTimes(1);
    });

    it("debounce: disconnect → connect в течение 500мс НЕ закрывает сокет", () => {
      const { svc, getMock } = loadService();
      svc.connect();
      svc.disconnect();
      svc.connect();
      jest.advanceTimersByTime(1000);
      expect(getMock().disconnect).not.toHaveBeenCalled();
    });

    it("disconnect через 500мс реально закрывает сокет", () => {
      const { svc, getMock } = loadService();
      svc.connect();
      svc.disconnect();
      jest.advanceTimersByTime(500);
      expect(getMock().disconnect).toHaveBeenCalled();
    });

    it("не закрывает сокет пока refCount > 0", () => {
      const { svc, getMock } = loadService();
      svc.connect();
      svc.connect();
      svc.disconnect();
      jest.advanceTimersByTime(1000);
      expect(getMock().disconnect).not.toHaveBeenCalled();
    });
  });

  describe("listener переподписка при пересоздании сокета (F1)", () => {
    it("после полного disconnect/connect listener'ы переподписываются на новый сокет", () => {
      const { svc, ioFn, getMock } = loadService();
      const cb = jest.fn();

      svc.connect();
      svc.onUserJoined(cb);
      const firstOnCount = getMock().on.mock.calls.filter(
        ([event]) => event === "board:user_joined",
      ).length;
      expect(firstOnCount).toBe(1);

      svc.disconnect();
      jest.advanceTimersByTime(500);
      svc.connect();

      // Новый сокет должен был получить .on('board:user_joined', cb) при ресабе.
      expect(ioFn).toHaveBeenCalledTimes(2);
      const secondOnCount = getMock().on.mock.calls.filter(
        ([event]) => event === "board:user_joined",
      ).length;
      expect(secondOnCount).toBeGreaterThanOrEqual(1);
    });

    it("unsubscribe удаляет listener из внутренней Map и не переподписывает", () => {
      const { svc, getMock } = loadService();
      const cb = jest.fn();

      svc.connect();
      const unsub = svc.onUserJoined(cb);
      unsub();

      svc.disconnect();
      jest.advanceTimersByTime(500);
      svc.connect();

      // На НОВЫЙ сокет cb не должен быть переподписан.
      const onCallsForCb = getMock().on.mock.calls.filter(
        ([event, callback]) =>
          event === "board:user_joined" && callback === cb,
      );
      expect(onCallsForCb.length).toBe(0);
    });

    it("Manager-events (reconnect_attempt) переподписываются на новый Manager", () => {
      const { svc, getMock } = loadService();
      const cb = jest.fn();

      svc.connect();
      svc.onReconnectAttempt(cb);

      svc.disconnect();
      jest.advanceTimersByTime(500);
      svc.connect();

      const managerOnCalls = getMock().io.on.mock.calls.filter(
        ([event]) => event === "reconnect_attempt",
      );
      expect(managerOnCalls.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("joinBoard ack (F4)", () => {
    it("резолвится с ack, который вернул сервер", async () => {
      const { svc, getMock } = loadService();
      svc.connect();

      const promise = svc.joinBoard("board-1");

      const emitCall = getMock().emit.mock.calls.find(
        ([event]) => event === "board:join",
      );
      expect(emitCall).toBeDefined();
      const ackCallback = emitCall![2] as (
        ack: { ok: boolean; users?: number },
      ) => void;
      ackCallback({ ok: true, users: 3 });

      await expect(promise).resolves.toEqual({ ok: true, users: 3 });
    });

    it("резолвится с error=timeout если сервер не ответил за ACK_TIMEOUT_MS", async () => {
      const { svc } = loadService();
      svc.connect();

      const promise = svc.joinBoard("board-1");
      jest.advanceTimersByTime(5_001);

      await expect(promise).resolves.toEqual({ ok: false, error: "timeout" });
    });

    it("резолвится с error=not_connected если сокет не открыт", async () => {
      const { svc } = loadService();
      await expect(svc.joinBoard("board-1")).resolves.toEqual({
        ok: false,
        error: "not_connected",
      });
    });
  });

  describe("isConnected", () => {
    it("false до connect", () => {
      const { svc } = loadService();
      expect(svc.isConnected()).toBe(false);
    });

    it("отражает состояние сокета", () => {
      const { svc, getMock } = loadService();
      svc.connect();
      getMock().__setConnected(true);
      expect(svc.isConnected()).toBe(true);
      getMock().__setConnected(false);
      expect(svc.isConnected()).toBe(false);
    });
  });
});
