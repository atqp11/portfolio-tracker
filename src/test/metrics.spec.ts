import fs from 'fs';
import path from 'path';
import { stopCompactionCleanupWorker } from '@lib/metrics';

const METRICS_PATH = path.join(process.cwd(), 'lib', 'metrics.ts');
const LOG_PATH = path.join(process.cwd(), 'logs', 'rate_limits.log');

describe('lib/metrics telemetry forwarding', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    // ensure telemetry disabled by default
    delete process.env.TELEMETRY_URL;
    delete process.env.TELEMETRY_TOKEN;
    delete process.env.TELEMETRY_BATCH_SIZE;
    delete process.env.TELEMETRY_FLUSH_INTERVAL_MS;
    process.env.DISABLE_TELEMETRY_COMPACTION = '1';
    if (fs.existsSync(LOG_PATH)) fs.unlinkSync(LOG_PATH);
  });

  afterEach(() => {
    // Ensure the compaction cleanup worker is stopped after each test
    stopCompactionCleanupWorker();
  });

  afterAll(() => {
    process.env = originalEnv;
    if (fs.existsSync(LOG_PATH)) fs.unlinkSync(LOG_PATH);
    stopCompactionCleanupWorker();
  });

  test('forwards events in batches to telemetry endpoint and still logs to file', async () => {
    process.env.TELEMETRY_URL = 'http://telemetry.test/ingest';
    process.env.TELEMETRY_TOKEN = 'tok';
    process.env.TELEMETRY_BATCH_SIZE = '2';
    process.env.TELEMETRY_FLUSH_INTERVAL_MS = '50';

    const mockFetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    (global as any).fetch = mockFetch;

    const metrics = jest.requireActual('@lib/metrics');

    // Add two entries which should trigger a batch flush (batch size = 2)
    await metrics.recordRateLimit('alpha_vantage', 'm1');
    await metrics.recordRateLimit('alpha_vantage', 'm2');

    // Ensure queued items flushed
    await metrics.flushTelemetry();
    // stop background timer so Jest can exit cleanly
    if (typeof metrics.stopTelemetry === 'function') metrics.stopTelemetry();

    expect(mockFetch).toHaveBeenCalled();
    const call = mockFetch.mock.calls[0];
    expect(call[0]).toBe(process.env.TELEMETRY_URL);
    const opts = call[1] || {};
    const sent = JSON.parse(opts.body as string);
    expect(Array.isArray(sent.events)).toBe(true);
    expect(sent.events.length).toBe(2);
    expect(sent.events[0].provider).toBe('alpha_vantage');

    // Also verify file log was written with two entries
    const lines = fs.readFileSync(LOG_PATH, 'utf8').split(/\r?\n/).filter(Boolean);
    expect(lines.length).toBe(2);
  });

  test('retries failed telemetry requests then succeeds', async () => {
    process.env.TELEMETRY_URL = 'http://telemetry.test/ingest';
    process.env.TELEMETRY_BATCH_SIZE = '1';
    process.env.TELEMETRY_RETRY_BASE_MS = '1';
    process.env.TELEMETRY_MAX_RETRIES = '2';

    // fail first, succeed second
    const mockFetch = jest.fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue({ ok: true, status: 200 });
    (global as any).fetch = mockFetch;

    const metrics = jest.requireActual('@lib/metrics');

    await metrics.recordRateLimit('alpha_vantage', 'retry-test');

    // flush which triggers retry logic
    const ok = await metrics.flushTelemetry();
    // stop background timer so Jest can exit cleanly
    if (typeof metrics.stopTelemetry === 'function') metrics.stopTelemetry();

    expect(ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);

    // file logging should still have the entry
    const lines = fs.readFileSync(LOG_PATH, 'utf8').split(/\r?\n/).filter(Boolean);
    expect(lines.length).toBe(1);
  });
});
