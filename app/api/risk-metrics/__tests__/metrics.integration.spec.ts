import http from 'http';
import fs from 'fs';
import path from 'path';
import { stopCompactionCleanupWorker } from '@lib/metrics';


const LOG_PATH = path.join(process.cwd(), 'logs', 'rate_limits.log');

describe('metrics telemetry end-to-end (integration)', () => {
  let server: http.Server;
  let port: number;
  let receivedBodies: any[] = [];

  beforeAll(done => {
    receivedBodies = [];
    server = http.createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/ingest') {
        let body = '';
        req.on('data', (chunk) => body += chunk);
        req.on('end', () => {
          try {
            receivedBodies.push(JSON.parse(body));
          } catch (e) {
            receivedBodies.push(body);
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        });
        return;
      }
      res.writeHead(404);
      res.end();
    });
    server.listen(0, () => {
      // @ts-ignore
      port = (server.address() as any).port;
      done();
    });
  });

  afterAll(done => {
    server.close(() => done());
  });

  beforeEach(() => {
    jest.resetModules();
    // ensure clean env
    delete process.env.TELEMETRY_URL;
    delete process.env.TELEMETRY_TOKEN;
    process.env.DISABLE_TELEMETRY_COMPACTION = '1';
    if (fs.existsSync(LOG_PATH)) fs.unlinkSync(LOG_PATH);
  });

  test('forwards payload to local telemetry endpoint', async () => {
    process.env.TELEMETRY_URL = `http://127.0.0.1:${port}/ingest`;
    process.env.TELEMETRY_BATCH_SIZE = '2';

    const metrics = jest.requireActual('@lib/metrics'); // New line


    // enqueue two events and force flush
    await metrics.recordRateLimit('alpha_vantage', 'int1');
    await metrics.recordRateLimit('alpha_vantage', 'int2');

    const ok = await metrics.flushTelemetry();
    if (typeof metrics.stopTelemetry === 'function') metrics.stopTelemetry();
    expect(ok).toBe(true);

    // give small time for server handlers
    await new Promise(r => setTimeout(r, 50));

    expect(receivedBodies.length).toBeGreaterThanOrEqual(1);
    const events = receivedBodies[0].events || receivedBodies[0];
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBe(2);
    expect(events[0].provider).toBe('alpha_vantage');

    // verify file fallback also written
    const lines = fs.readFileSync(LOG_PATH, 'utf8').split(/\r?\n/).filter(Boolean);
    expect(lines.length).toBe(2);
  });

  afterAll(() => {
    stopCompactionCleanupWorker();
  });
});
