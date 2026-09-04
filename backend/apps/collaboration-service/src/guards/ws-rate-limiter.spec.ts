import { WsRateLimiter, WS_RATE_LIMITS } from './ws-rate-limiter';

describe('WsRateLimiter', () => {
  let limiter: WsRateLimiter;

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    limiter = new WsRateLimiter();
  });

  afterEach(() => {
    limiter.destroy(); // clearInterval, otherwise jest --detectOpenHandles complains
    jest.restoreAllMocks();
  });

  describe('allow', () => {
    it('lets the very first call through and starts a new bucket', () => {
      expect(limiter.allow('sock-1', 'cursor:move', 3, 1000)).toBe(true);
    });

    it('lets calls up to the limit through within a single window', () => {
      expect(limiter.allow('sock-1', 'cursor:move', 3, 1000)).toBe(true);
      expect(limiter.allow('sock-1', 'cursor:move', 3, 1000)).toBe(true);
      expect(limiter.allow('sock-1', 'cursor:move', 3, 1000)).toBe(true);
    });

    it('rejects calls past the limit within the same window', () => {
      for (let i = 0; i < 3; i++) limiter.allow('sock-1', 'cursor:move', 3, 1000);

      expect(limiter.allow('sock-1', 'cursor:move', 3, 1000)).toBe(false);
      expect(limiter.allow('sock-1', 'cursor:move', 3, 1000)).toBe(false);
    });

    it('opens a fresh window once the previous one expires', () => {
      limiter.allow('sock-1', 'cursor:move', 1, 1000); // burns the only slot
      expect(limiter.allow('sock-1', 'cursor:move', 1, 1000)).toBe(false);

      // jump past the window
      (Date.now as jest.Mock).mockReturnValue(1_000_000 + 1500);

      expect(limiter.allow('sock-1', 'cursor:move', 1, 1000)).toBe(true);
    });

    it('tracks limits independently per event type', () => {
      limiter.allow('sock-1', 'cursor:move', 1, 1000);
      expect(limiter.allow('sock-1', 'cursor:move', 1, 1000)).toBe(false);
      // a different event type shares no quota
      expect(limiter.allow('sock-1', 'element:create', 1, 1000)).toBe(true);
    });

    it('tracks limits independently per socket', () => {
      limiter.allow('sock-1', 'cursor:move', 1, 1000);
      expect(limiter.allow('sock-1', 'cursor:move', 1, 1000)).toBe(false);
      // sock-2 is a different identity
      expect(limiter.allow('sock-2', 'cursor:move', 1, 1000)).toBe(true);
    });
  });

  describe('removeSocket', () => {
    it('drops the socket from every event map so its quota resets', () => {
      limiter.allow('sock-1', 'cursor:move', 1, 1000);
      limiter.allow('sock-1', 'element:create', 1, 1000);
      expect(limiter.allow('sock-1', 'cursor:move', 1, 1000)).toBe(false);

      limiter.removeSocket('sock-1');

      expect(limiter.allow('sock-1', 'cursor:move', 1, 1000)).toBe(true);
      expect(limiter.allow('sock-1', 'element:create', 1, 1000)).toBe(true);
    });

    it('is a no-op for an unknown socket', () => {
      expect(() => limiter.removeSocket('never-existed')).not.toThrow();
    });
  });

  describe('destroy', () => {
    it('clears the cleanup interval and wipes all buckets', () => {
      const clearSpy = jest.spyOn(global, 'clearInterval');
      limiter.allow('sock-1', 'cursor:move', 1, 1000);

      limiter.destroy();

      expect(clearSpy).toHaveBeenCalled();
      // bucket is gone → next allow starts a fresh window
      expect(limiter.allow('sock-1', 'cursor:move', 1, 1000)).toBe(true);
    });
  });

  describe('background cleanup', () => {
    it('removes expired buckets when the periodic cleanup fires', () => {
      jest.useFakeTimers().setSystemTime(1_000_000);
      // re-create under fake timers so setInterval is hooked
      limiter.destroy();
      limiter = new WsRateLimiter();
      limiter.allow('sock-1', 'cursor:move', 5, 1000);

      // jump 70s into the future and let the 60s interval tick
      jest.setSystemTime(1_000_000 + 70_000);
      jest.advanceTimersByTime(60_000);

      // the bucket is gone, so a brand-new window starts (count resets to 1)
      // we test indirectly: even with maxPerWindow=1 the next allow returns true
      expect(limiter.allow('sock-1', 'cursor:move', 1, 1000)).toBe(true);

      jest.useRealTimers();
    });
  });

  describe('WS_RATE_LIMITS table', () => {
    it('exposes the expected events with [maxPerWindow, windowMs] tuples', () => {
      expect(WS_RATE_LIMITS['cursor:move']).toEqual([60, 1000]);
      expect(WS_RATE_LIMITS['board:join']).toEqual([5, 10_000]);
      expect(WS_RATE_LIMITS['ai:message']).toEqual([3, 10_000]);
    });
  });
});
