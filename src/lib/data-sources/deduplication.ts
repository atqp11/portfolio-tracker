/**
 * Request Deduplication
 *
 * Prevents multiple concurrent requests for the same resource.
 * Uses a Map of promises keyed by resource identifier.
 *
 * Example:
 * - Request 1: fetchQuote('AAPL') - starts fetch
 * - Request 2: fetchQuote('AAPL') - waits for Request 1's promise
 * - Request 3: fetchQuote('MSFT') - starts new fetch
 *
 * Cleanup Strategy:
 * - Remove entry after promise settles (success or failure)
 * - Periodic cleanup of stale entries (every 5 minutes)
 * - Max entry age: 30 seconds (timeout safety)
 */

// ============================================================================
// TYPES
// ============================================================================

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
  key: string;
}

// ============================================================================
// DEDUPLICATION MANAGER
// ============================================================================

export class RequestDeduplicationManager {
  private static instance: RequestDeduplicationManager | null = null;
  private pendingRequests = new Map<string, PendingRequest<any>>();
  private readonly MAX_AGE_MS = 30000; // 30 seconds
  private readonly CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  private cleanupTimer: NodeJS.Timeout | null = null;

  private constructor() {
    // Start periodic cleanup
    this.startCleanup();
  }

  public static getInstance(): RequestDeduplicationManager {
    if (!RequestDeduplicationManager.instance) {
      RequestDeduplicationManager.instance = new RequestDeduplicationManager();
    }
    return RequestDeduplicationManager.instance;
  }

  /**
   * Execute a function with deduplication
   *
   * If a request for the same key is already pending, returns that promise.
   * Otherwise, executes the function and caches the promise.
   *
   * @param key - Unique identifier for this request (e.g., "quote:AAPL")
   * @param fn - Function to execute if not deduplicated
   * @returns Promise from fn or cached promise
   */
  public async deduplicate<T>(
    key: string,
    fn: () => Promise<T>
  ): Promise<{ data: T; deduplicated: boolean }> {
    // Check if request is already pending
    const existing = this.pendingRequests.get(key);
    if (existing) {
      const age = Date.now() - existing.timestamp;
      if (age < this.MAX_AGE_MS) {
        console.log(`[Deduplication] Cache hit for key: ${key} (age: ${age}ms)`);
        const data = await existing.promise;
        return { data, deduplicated: true };
      } else {
        // Stale entry, remove it
        console.warn(`[Deduplication] Stale entry for key: ${key} (age: ${age}ms), removing`);
        this.pendingRequests.delete(key);
      }
    }

    // Start new request
    console.log(`[Deduplication] Starting new request for key: ${key}`);
    const promise = fn();

    // Cache the promise
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
      key,
    });

    // Remove from cache when settled
    promise
      .then(() => {
        this.pendingRequests.delete(key);
      })
      .catch(() => {
        this.pendingRequests.delete(key);
      });

    const data = await promise;
    return { data, deduplicated: false };
  }

  /**
   * Get statistics about pending requests
   */
  public getStats(): {
    pendingCount: number;
    oldestRequestAge: number;
    keys: string[];
  } {
    const now = Date.now();
    let oldestAge = 0;
    const keys: string[] = [];

    this.pendingRequests.forEach((req) => {
      const age = now - req.timestamp;
      if (age > oldestAge) {
        oldestAge = age;
      }
      keys.push(req.key);
    });

    return {
      pendingCount: this.pendingRequests.size,
      oldestRequestAge: oldestAge,
      keys,
    };
  }

  /**
   * Clear all pending requests (for testing)
   */
  public clear(): void {
    this.pendingRequests.clear();
  }

  /**
   * Stop cleanup timer (for testing)
   */
  public stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupStaleEntries();
    }, this.CLEANUP_INTERVAL_MS);

    // Don't keep Node.js process alive for cleanup timer
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  private cleanupStaleEntries(): void {
    const now = Date.now();
    let cleaned = 0;

    this.pendingRequests.forEach((req, key) => {
      const age = now - req.timestamp;
      if (age > this.MAX_AGE_MS) {
        this.pendingRequests.delete(key);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      console.log(`[Deduplication] Cleaned ${cleaned} stale entries`);
    }
  }
}
