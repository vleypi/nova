

interface RateBucket {
  count:    number;
  resetAt:  number;
}

export class WsRateLimiter {
 
  private buckets = new Map<string, Map<string, RateBucket>>();

  // Периодическая очистка просроченных записей 
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 60_000);
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.buckets.clear();
  }

  //
  allow(socketId: string, eventType: string, maxPerWindow: number, windowMs: number): boolean {
    if (!this.buckets.has(eventType)) {
      this.buckets.set(eventType, new Map());
    }
    const eventMap = this.buckets.get(eventType)!;

    const now = Date.now();
    const bucket = eventMap.get(socketId);

    if (!bucket || now >= bucket.resetAt) {
      eventMap.set(socketId, { count: 1, resetAt: now + windowMs });
      return true;
    }

    bucket.count++;
    return bucket.count <= maxPerWindow;
  }

  //
  removeSocket(socketId: string): void {
    for (const eventMap of this.buckets.values()) {
      eventMap.delete(socketId);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const eventMap of this.buckets.values()) {
      for (const [socketId, bucket] of eventMap) {
        if (now >= bucket.resetAt) eventMap.delete(socketId);
      }
    }
  }
}

//
export const WS_RATE_LIMITS: Record<string, [number, number]> = {
  'cursor:move':      [60, 1_000],   
  'element:create':   [10, 1_000],  
  'element:update':   [30, 1_000],   
  'element:delete':   [10, 1_000],   
  'element:drawing':  [60, 1_000],   
  'board:join':       [5,  10_000], 
  'board:leave':      [5,  10_000], 
  'ai:message':       [3,  10_000],
};
