import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Optional Redis client for distributed locking (used only when TELEMETRY_REDIS_URL is set)
let redisClient: any = null;
let redisLockSupported = false;
const TELEMETRY_REDIS_URL = process.env.TELEMETRY_REDIS_URL || '';
const TELEMETRY_COMPACT_LOCK_TTL_MS = Number(process.env.TELEMETRY_COMPACT_LOCK_TTL_MS || '30000');

if (TELEMETRY_REDIS_URL) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const IORedis = require('ioredis');
    redisClient = new IORedis(TELEMETRY_REDIS_URL);
    redisLockSupported = true;
  } catch (e) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Redis = require('redis');
      redisClient = Redis.createClient({ url: TELEMETRY_REDIS_URL });
      // connect in background (do not await here)
      redisClient.connect && redisClient.connect().catch(() => {});
      redisLockSupported = true;
    } catch (err) {
      // If neither client is available, distributed locking will be disabled.
      redisClient = null;
      redisLockSupported = false;
    }
  }
}

const redisLockKey = 'telemetry:compact:lock';
const redisLockTokens = new Map<string, string>();

async function acquireCompactionLock(): Promise<string | null> {
  if (redisLockSupported && redisClient) {
    const token = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    try {
      // ioredis and node-redis return 'OK' on success
      const res = await redisClient.set(redisLockKey, token, 'PX', TELEMETRY_COMPACT_LOCK_TTL_MS, 'NX');
      if (res === 'OK' || res === true) {
        redisLockTokens.set(redisLockKey, token);
        return token;
      }
      return null;
    } catch (err) {
      return null;
    }
  }

  // Fall back to filesystem lock
  try {
    const lockPath = path.join(TELEMETRY_QUEUE_DIR, '.compact.lock');
    fs.writeFileSync(lockPath, String(process.pid), { flag: 'wx' });
    return lockPath;
  } catch (err) {
    return null;
  }
}

async function releaseCompactionLock(tokenOrPath: string | null) {
  if (!tokenOrPath) return;
  if (redisLockSupported && redisClient) {
    try {
      const token = redisLockTokens.get(redisLockKey);
      if (!token) return;
      const releaseScript = `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`;
      // ioredis supports eval(script, keys, args...) signature
      try {
        await redisClient.eval(releaseScript, 1, redisLockKey, token);
      } catch (e) {
        // node-redis v4 uses different signature
        try { await redisClient.eval(releaseScript, { keys: [redisLockKey], arguments: [token] }); } catch (e2) {}
      }
      redisLockTokens.delete(redisLockKey);
    } catch (err) {
      // ignore
    }
    return;
  }

  // filesystem lock cleanup
  try {
    if (tokenOrPath && fs.existsSync(tokenOrPath)) fs.unlinkSync(tokenOrPath);
  } catch (err) {
    // ignore
  }
}

const LOG_DIR = path.resolve(process.cwd(), 'logs');
const RATE_LIMIT_LOG = path.join(LOG_DIR, 'rate_limits.log');

function ensureLogDir() {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
  } catch (e) {
    // swallow - best-effort logging
  }
}

type RateLimitEntry = { ts: string; provider: string; message: string };

type RateLimitEntryOnDisk = RateLimitEntry & { __file?: string };

// Telemetry configuration pulled from environment variables. If TELEMETRY_URL is set,
// we'll try to forward rate-limit events to that endpoint using a small batcher.
const TELEMETRY_URL = process.env.TELEMETRY_URL || '';
const TELEMETRY_TOKEN = process.env.TELEMETRY_TOKEN || '';
const TELEMETRY_BATCH_SIZE = Number(process.env.TELEMETRY_BATCH_SIZE || '10');
const TELEMETRY_FLUSH_INTERVAL_MS = Number(process.env.TELEMETRY_FLUSH_INTERVAL_MS || '5000');
const TELEMETRY_RETRY_BASE_MS = Number(process.env.TELEMETRY_RETRY_BASE_MS || '500');
const TELEMETRY_MAX_RETRIES = Number(process.env.TELEMETRY_MAX_RETRIES || '3');

let telemetryQueue: RateLimitEntryOnDisk[] = [];
let telemetryEnabled = Boolean(TELEMETRY_URL);
let workerStarted = false;
let workerPromise: Promise<void> | null = null;
let workerSleepTimer: NodeJS.Timeout | null = null;

// Persistent queue directory (append-as-files). Each event is written as its own file
// in this directory. The worker will read files, send them, and delete them on success.
const TELEMETRY_QUEUE_DIR = path.join(LOG_DIR, 'telemetry_queue');

// Queue rotation / compaction configuration
const TELEMETRY_QUEUE_MAX_FILES = Number(process.env.TELEMETRY_QUEUE_MAX_FILES || '1000'); // max files before compaction
const TELEMETRY_QUEUE_MAX_BYTES = Number(process.env.TELEMETRY_QUEUE_MAX_BYTES || String(50 * 1024 * 1024)); // 50MB default
const TELEMETRY_QUEUE_COMPACT_GZIP = (process.env.TELEMETRY_QUEUE_COMPACT_GZIP || '1') !== '0';
// Retention / archive limits for compacted archives
const TELEMETRY_COMPACT_RETENTION_DAYS = Number(process.env.TELEMETRY_COMPACT_RETENTION_DAYS || '30');
const TELEMETRY_COMPACT_MAX_ARCHIVES = Number(process.env.TELEMETRY_COMPACT_MAX_ARCHIVES || '20');

// Internal counters / health metrics
let totalEnqueued = 0;
let totalSent = 0;
let totalFailed = 0;
let flushSuccessCount = 0;
let flushFailureCount = 0;
let lastFlushAt: string | null = null;
let compactionCount = 0;
let lastCompactionAt: string | null = null;
let compactArchivesCount = 0;

function ensureQueueDir() {
  try {
    ensureLogDir();
    if (!fs.existsSync(TELEMETRY_QUEUE_DIR)) fs.mkdirSync(TELEMETRY_QUEUE_DIR, { recursive: true });
  } catch (e) {
    // swallow
  }
}

function enqueueToDisk(entry: RateLimitEntry): string | null {
  try {
    ensureQueueDir();
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.json`;
    const filePath = path.join(TELEMETRY_QUEUE_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(entry), { encoding: 'utf8' });
    // After writing, attempt to compact if the queue appears to be growing too large.
    try {
      compactQueueIfNeeded();
    } catch (err) {
      // best-effort: do not fail enqueue if compaction errors
    }
    return filePath;
  } catch (err) {
    console.error('Failed to enqueue telemetry to disk:', err);
    return null;
  }
}

function loadPendingFromDisk() {
  try {
    ensureQueueDir();
    const files = fs.readdirSync(TELEMETRY_QUEUE_DIR).sort();
    for (const f of files) {
      try {
        const p = path.join(TELEMETRY_QUEUE_DIR, f);
        const content = fs.readFileSync(p, { encoding: 'utf8' });
        const obj = JSON.parse(content) as RateLimitEntry;
        telemetryQueue.push({ ...obj, __file: p });
      } catch (err) {
        // ignore malformed file
      }
    }
    try {
      // If at startup the queue is large, attempt compaction proactively.
      compactQueueIfNeeded();
    } catch (err) {
      // ignore
    }
    try {
      // Also cleanup old compact archives according to retention policy
      cleanupOldCompactedArchives();
    } catch (err) {
      // ignore
    }
  } catch (err) {
    // ignore
  }
}

function compactQueueIfNeeded() {
  // fire-and-forget async compaction so enqueueToDisk remains sync
  void compactQueueIfNeededAsync().catch(() => {});
}

async function compactQueueIfNeededAsync() {
  try {
    ensureQueueDir();
    // Acquire distributed lock (Redis) or fallback to filesystem lock
    let lockToken: string | null = null;
    try {
      lockToken = await acquireCompactionLock();
      if (!lockToken) return; // couldn't acquire lock
    } catch (err) {
      return;
    }

    try {
      const files = fs.readdirSync(TELEMETRY_QUEUE_DIR).filter(f => !f.startsWith('.')).sort();
      // Compute total size and file count
      let totalBytes = 0;
      for (const f of files) {
        try {
          const st = fs.statSync(path.join(TELEMETRY_QUEUE_DIR, f));
          totalBytes += st.size;
        } catch (err) {
          // ignore
        }
      }

      if (files.length <= TELEMETRY_QUEUE_MAX_FILES && totalBytes <= TELEMETRY_QUEUE_MAX_BYTES) {
        return; // no compaction needed
      }

      // Determine how many oldest files to compact until we're under thresholds
      const toCompact: string[] = [];
      let bytesFreed = 0;
      for (const f of files) {
        if (files.length - toCompact.length <= TELEMETRY_QUEUE_MAX_FILES && (totalBytes - bytesFreed) <= TELEMETRY_QUEUE_MAX_BYTES) break;
        toCompact.push(f);
        try { bytesFreed += fs.statSync(path.join(TELEMETRY_QUEUE_DIR, f)).size; } catch {}
      }

      if (toCompact.length === 0) return;

      const compactFilenameBase = `compact-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
      const compactFilePath = path.join(TELEMETRY_QUEUE_DIR, `${compactFilenameBase}.jsonl`);

      // Merge files into a single jsonl (optionally gzipped)
      const writeStream = fs.createWriteStream(compactFilePath, { encoding: 'utf8' });
      for (const f of toCompact) {
        const p = path.join(TELEMETRY_QUEUE_DIR, f);
        try {
          const content = fs.readFileSync(p, { encoding: 'utf8' });
          // if the file contains a single JSON object, write it as one line
          writeStream.write(content + '\n');
        } catch (err) {
          // ignore problematic file
        }
      }
      writeStream.end();

      // Optionally gzip the compacted file to save space
      if (TELEMETRY_QUEUE_COMPACT_GZIP) {
        const data = fs.readFileSync(compactFilePath, { encoding: 'utf8' });
        const gz = zlib.gzipSync(Buffer.from(data, 'utf8'));
        const gzPath = compactFilePath + '.gz';
        fs.writeFileSync(gzPath, gz);
        fs.unlinkSync(compactFilePath);
      }

      // Delete the original compacted files
      for (const f of toCompact) {
        try {
          fs.unlinkSync(path.join(TELEMETRY_QUEUE_DIR, f));
        } catch (err) {
          // ignore
        }
      }

      compactionCount += 1;
      lastCompactionAt = new Date().toISOString();
      // After compaction, run archive retention/cleanup
      try {
        cleanupOldCompactedArchives();
      } catch (err) {
        // ignore
      }
    } finally {
      try { await releaseCompactionLock(lockToken); } catch (err) { /* ignore */ }
    }
  } catch (err) {
    // swallow compaction errors — compaction is best-effort
  }
}

function cleanupOldCompactedArchives() {
  try {
    ensureQueueDir();
    const files = fs.readdirSync(TELEMETRY_QUEUE_DIR)
      .filter(f => f.startsWith('compact-') && (f.endsWith('.jsonl') || f.endsWith('.jsonl.gz')))
      .map(f => ({ name: f, path: path.join(TELEMETRY_QUEUE_DIR, f) }));

    const now = Date.now();
    const retentionMs = TELEMETRY_COMPACT_RETENTION_DAYS * 24 * 60 * 60 * 1000;

    // Build list with mtime
    const withMtime = files.map(f => {
      try {
        const st = fs.statSync(f.path);
        return { ...f, mtime: st.mtimeMs };
      } catch (err) {
        return { ...f, mtime: 0 };
      }
    }).sort((a, b) => b.mtime - a.mtime); // newest first

    // First, delete archives older than retention
    for (const f of withMtime.slice().reverse()) { // oldest first
      try {
        if (f.mtime > 0 && (now - f.mtime) > retentionMs) {
          fs.unlinkSync(f.path);
        }
      } catch (err) {
        // ignore
      }
    }

    // Recompute list after time-based deletion
    const remaining = fs.readdirSync(TELEMETRY_QUEUE_DIR)
      .filter(f => f.startsWith('compact-') && (f.endsWith('.jsonl') || f.endsWith('.jsonl.gz')))
      .map(f => ({ name: f, path: path.join(TELEMETRY_QUEUE_DIR, f) }))
      .map(f => {
        try { return { ...f, mtime: fs.statSync(f.path).mtimeMs }; } catch { return { ...f, mtime: 0 }; }
      })
      .sort((a, b) => b.mtime - a.mtime);

    // If still too many archives, keep newest TELEMETRY_COMPACT_MAX_ARCHIVES and delete the rest
    if (remaining.length > TELEMETRY_COMPACT_MAX_ARCHIVES) {
      const toDelete = remaining.slice(TELEMETRY_COMPACT_MAX_ARCHIVES);
      for (const f of toDelete) {
        try { fs.unlinkSync(f.path); } catch {};
      }
    }

    // Update count
    compactArchivesCount = fs.readdirSync(TELEMETRY_QUEUE_DIR).filter(f => f.startsWith('compact-') && (f.endsWith('.jsonl') || f.endsWith('.jsonl.gz'))).length;
  } catch (err) {
    // swallow
  }
}

// Scheduled cleanup worker for compact archives (cron-like)
const TELEMETRY_COMPACT_CLEANUP_INTERVAL_MS = Number(process.env.TELEMETRY_COMPACT_CLEANUP_INTERVAL_MS || String(24 * 60 * 60 * 1000));
let compactCleanupTimer: NodeJS.Timeout | null = null;

export function startCompactionCleanupWorker() {
    if (process.env.DISABLE_TELEMETRY_COMPACTION === '1') return;
    if (compactCleanupTimer) {
        console.warn('Compaction cleanup worker is already running.');
        return;
    }
    try {
        compactCleanupTimer = setInterval(() => {
            try {
                cleanupOldCompactedArchives();
            } catch (err) {
                console.error('Error during cleanup:', err);
            }
        }, TELEMETRY_COMPACT_CLEANUP_INTERVAL_MS);
    } catch (err) {
        console.error('Failed to start compaction cleanup worker:', err);
    }
}

export function stopCompactionCleanupWorker() {
  if (compactCleanupTimer) {
    clearInterval(compactCleanupTimer);
    compactCleanupTimer = null;
  }
}async function flushTelemetryOnce(retries = 0): Promise<boolean> {
  if (!telemetryEnabled) return false;
  if (!TELEMETRY_URL) return false;
  const batch = telemetryQueue.splice(0, TELEMETRY_BATCH_SIZE) as RateLimitEntryOnDisk[];
  if (batch.length === 0) return true;

  try {
    const body = JSON.stringify({ events: batch });
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (TELEMETRY_TOKEN) headers['Authorization'] = `Bearer ${TELEMETRY_TOKEN}`;

    // Use global fetch (Node 18+) or polyfilled fetch in tests/environment.
    const res = await fetch(TELEMETRY_URL, { method: 'POST', headers, body });
    if (!res.ok) throw new Error(`Telemetry endpoint responded ${res.status}`);
    // delete files for entries that were persisted
    for (const e of batch) {
      try {
        if (e.__file && fs.existsSync(e.__file)) fs.unlinkSync(e.__file);
      } catch (err) {
        // ignore
      }
    }
    totalSent += batch.length;
    flushSuccessCount += 1;
    lastFlushAt = new Date().toISOString();
    return true;
  } catch (err) {
    // On failure, push items back to the front of the queue so they're retried.
    telemetryQueue = batch.concat(telemetryQueue);
    if (retries < TELEMETRY_MAX_RETRIES + 1) {
      const delay = TELEMETRY_RETRY_BASE_MS * Math.pow(2, retries);
      await new Promise(r => setTimeout(r, delay));
      return flushTelemetryOnce(retries + 1);
    }
    // Give up for now; leave items in queue for next flush attempt.
    console.error('Telemetry forwarding failed:', err);
    totalFailed += batch.length;
    flushFailureCount += 1;
    return false;
  }
}

function startTelemetryWorker() {
  if (!telemetryEnabled) return;
  if (workerStarted) return;
  workerStarted = true;
  workerPromise = (async () => {
    while (telemetryEnabled) {
      try {
        if (telemetryQueue.length > 0) {
          await flushTelemetryOnce();
        }
      } catch (e) {
        // best-effort — swallow and continue loop
      }

      // Cancellable sleep: store timer so stopTelemetry can clear it immediately
      await new Promise<void>(resolve => {
        workerSleepTimer = setTimeout(() => {
          workerSleepTimer = null;
          resolve();
        }, TELEMETRY_FLUSH_INTERVAL_MS);
      });
    }
    workerStarted = false;
    workerPromise = null;
  })();
}

// Load any pending items from disk into the in-memory queue at startup so the worker
// will pick them up.
try {
  loadPendingFromDisk();
} catch (e) {
  // ignore
}

export async function recordRateLimit(provider: string, message?: string) {
  // Best-effort server-side log. If running in browser, fall back to console.warn.
  if (typeof window !== 'undefined') {
    console.warn(`Rate limit recorded (client): ${provider} - ${message ?? ''}`);
    return;
  }

  const entry: RateLimitEntry = {
    ts: new Date().toISOString(),
    provider,
    message: message ?? ''
  };

  // Always append to local file log as a durable fallback.
  try {
    ensureLogDir();
    fs.appendFileSync(RATE_LIMIT_LOG, JSON.stringify(entry) + '\n', { encoding: 'utf8' });
  } catch (err) {
    console.error('Failed to write rate limit log:', err);
  }

  // If telemetry is enabled, enqueue and try to flush asynchronously.
  // Always enqueue to disk for durability; memory queue is a view of disk queue.
  const filePath = enqueueToDisk(entry);
  totalEnqueued += 1;
  const diskEntry: RateLimitEntryOnDisk = { ...entry, __file: filePath ?? undefined };
  telemetryQueue.push(diskEntry);

  if (telemetryEnabled) {
    if (telemetryQueue.length >= TELEMETRY_BATCH_SIZE) {
      // fire-and-forget immediate flush for large batches
      flushTelemetryOnce().catch(() => {});
    }
    // ensure background worker is started
    startTelemetryWorker();
  }
}

export function readRateLimitLog(): Array<RateLimitEntry> {
  if (typeof window !== 'undefined') return [];
  try {
    if (!fs.existsSync(RATE_LIMIT_LOG)) return [];
    const lines = fs.readFileSync(RATE_LIMIT_LOG, { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
    return lines.map(l => JSON.parse(l));
  } catch (err) {
    console.error('Failed to read rate limit log:', err);
    return [];
  }
}

export function getRateLimitCounts(): Record<string, number> {
  const entries = readRateLimitLog();
  return entries.reduce((acc, e) => {
    acc[e.provider] = (acc[e.provider] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

// Expose a manual flush utility (useful in tests or shutdown hooks)
export async function flushTelemetry() {
  if (!telemetryEnabled) return false;
  return flushTelemetryOnce();
}

// If telemetry is enabled at module load, start background worker to ensure delivery.
if (telemetryEnabled) startTelemetryWorker();
// Start compaction cleanup worker unconditionally (best-effort; it will noop if dir missing)
try { startCompactionCleanupWorker(); } catch (err) { /* ignore */ }

// Helper to stop background flush timer (useful in tests and graceful shutdown)
export function stopTelemetry() {
  telemetryEnabled = false;
  if (workerSleepTimer) {
    clearTimeout(workerSleepTimer);
    workerSleepTimer = null;
  }
  telemetryQueue = [];
  workerStarted = false;
  workerPromise = null;
}

export function getTelemetryStats() {
  return {
    telemetryEnabled,
    queueLength: telemetryQueue.length,
    totalEnqueued,
    totalSent,
    totalFailed,
    flushSuccessCount,
    flushFailureCount,
    lastFlushAt,
    compactionCount,
    lastCompactionAt,
    compactArchivesCount,
    compactRetentionDays: TELEMETRY_COMPACT_RETENTION_DAYS,
    compactMaxArchives: TELEMETRY_COMPACT_MAX_ARCHIVES,
  };
}
