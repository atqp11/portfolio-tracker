# Load Testing Guide - Phase 4 Workstream 4

## Overview

This directory contains load testing configuration and scripts for stress-testing the Portfolio Tracker application. Load tests validate that the system handles high concurrency gracefully, with cache hits, circuit breakers, and graceful degradation all working correctly.

## Purpose

Phase 4 hardening requires validating system behavior under load to ensure:

1. **Cache Effectiveness**: Verify 60-80% cache hit rate under sustained load
2. **Circuit Breaker Activation**: Confirm circuit breakers activate correctly when providers fail
3. **API Performance**: Measure p95/p99 latencies and throughput
4. **Error Rate**: Confirm error rate stays below 1% with healthy providers
5. **Provider Isolation**: Verify one provider's failure doesn't cascade

## Components

### Files

- **config.yml**: Main Artillery configuration
  - 4 load phases (warm up → ramp up → peak → cool down)
  - 5 scenario profiles (cache hits, cache misses, fundamentals, commodities, risk metrics)
  - Weighted distribution: heavy emphasis on cache hits (30%), moderate on fresh requests (20%)
  - Timeout: 10 second max per request

- **processor.js**: Custom Artillery functions
  - Request preprocessing (add test run ID, headers)
  - Response processing (emit metrics, track cache/circuit breaker status)
  - Slow request detection (>5s logged)
  - Random symbol/commodity generation

- **run.js**: Test runner script
  - Parses CLI arguments (--target, --env, --output)
  - Validates server is running before test starts
  - Generates JSON + HTML reports
  - Displays summary statistics

## Installation

Artillery and dependencies are in `package.json`:

```bash
npm install  # Installs artillery and all dependencies
```

## Running Load Tests

### Basic: Against Localhost

```bash
npm run test:load
```

This runs the load test against the default target (`http://localhost:3000`).

### Custom Target

```bash
npm run test:load -- --target http://api.staging.example.com
```

### Custom Configuration

```bash
npm run test:load -- --config ./custom-config.yml --output ./results/custom.json
```

### Specific Environment

```bash
npm run test:load -- --env production
NODE_ENV=production npm run test:load
```

## Expected Behavior

### Scenario Execution (240 second total)

1. **Warm Up (60s, 10 arrivals/sec)**
   - Establishes baseline
   - Pre-loads cache
   - ~600 total requests

2. **Ramp Up (120s, 50 arrivals/sec)**
   - Simulates increasing traffic
   - Cache hit rate should stay 60%+
   - ~6,000 total requests

3. **Peak Load (60s, 100 arrivals/sec)**
   - Maximum sustained load
   - Tests circuit breaker under stress
   - ~6,000 total requests

4. **Cool Down (60s, 10 arrivals/sec)**
   - System recovery validation
   - Cache should recover
   - ~600 total requests

### Expected Metrics

| Metric | Target | Notes |
|--------|--------|-------|
| Success Rate | >99% | <1% error rate with healthy providers |
| p95 Latency | <1000ms | 95th percentile response time |
| p99 Latency | <2000ms | 99th percentile response time |
| Cache Hit Rate | 60-80% | Measured from X-Cache-Status header |
| Throughput | 50+ req/s | During peak phase |
| Circuit Breaker Trips | 0 | Should not trip with healthy providers |

## Metrics Collection

### Automatically Tracked

- `http.request.duration`: Response time (ms)
- `http.request.success`: Count of 2xx responses
- `http.request.failure`: Count of 4xx/5xx responses
- `http.status.*`: Count per status code (200, 404, 500, etc.)
- `cache.*`: Count per cache status (hit, miss, stale)
- `circuit-breaker.*`: Count per circuit breaker state (closed, open, half-open)
- `http.slow-requests`: Count of requests >5000ms

### Custom Headers (when supported)

Response headers may include:
- `X-Cache-Status`: hit, miss, or stale
- `X-Circuit-Breaker-State`: closed, open, or half-open
- `X-Response-Time`: Server processing time (ms)

## Reports

### JSON Report

Generated at `load-tests/report-TIMESTAMP.json`. Contains:

```json
{
  "aggregate": {
    "codes": { "200": 19500, "404": 450, "500": 50 },
    "latency": { "min": 10, "max": 8500, "p50": 125, "p95": 850, "p99": 2300 },
    "rps": { "mean": 66.7, "max": 105 },
    "requests": { "total": 20000, "completed": 19800 }
  },
  "scenarios": [...]
}
```

### HTML Report

Generated at `load-tests/report-TIMESTAMP.html`. Includes:

- Timeline graphs of latency, throughput, error rate
- Scenario breakdown by type
- Response code distribution
- Latency percentile charts

To manually generate HTML from JSON:

```bash
artillery report load-tests/report-TIMESTAMP.json -o report.html
```

## Troubleshooting

### "Server is not running" warning

```bash
# Start the dev server in another terminal
npm run dev

# Then run tests
npm run test:load
```

### No requests sent

**Issue**: Artillery may not be finding endpoints
**Solution**: Verify API_BASE_URL matches your server

```bash
npm run test:load -- --target http://localhost:3000
```

### High error rate

**Possible causes**:
- Server is slow/overloaded → increase phase timeout in config.yml
- API keys not configured → check .env.local
- Database connection issues → check logs with `npm run dev`

### Can't install artillery

**On Windows**, you may need to install build tools:

```bash
npm install --global windows-build-tools
npm install
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
- name: Run Load Tests
  run: |
    npm run dev &  # Start server in background
    sleep 5  # Wait for server startup
    npm run test:load -- --target http://localhost:3000 --output ./results/load-test.json
    
- name: Upload Results
  uses: actions/upload-artifact@v2
  if: always()
  with:
    name: load-test-results
    path: load-tests/report-*.{json,html}
```

## Performance Tuning

### If p95 latency is too high (>1000ms):

1. **Increase cache TTL**: Modify `config/cache.config.ts`
2. **Reduce concurrent requests**: Lower `arrivalRate` in config.yml
3. **Optimize slow queries**: Profile database queries with slow request logs

### If error rate is high (>1%):

1. **Check provider health**: Verify API keys and rate limits
2. **Increase timeouts**: Modify `timeout` in config.yml
3. **Monitor circuit breaker**: Check circuit-breaker.* metrics

### To achieve 80% cache hit rate:

1. Ensure warm-up phase completes (pre-loads cache)
2. Use same symbols repeatedly in scenarios (30% weight on AAPL for example)
3. Increase cache TTL for stable data

## Next Steps

After load testing:

1. **Collect baseline metrics**: Save report from healthy state
2. **Identify bottlenecks**: Review slow requests and error patterns
3. **Implement optimizations**: Based on metrics
4. **Re-run tests**: Compare against baseline
5. **Set alerts**: Configure monitoring based on load test thresholds

## References

- [Artillery Documentation](https://artillery.io/docs)
- [Cache Configuration](../src/lib/config/cache.config.ts)
- [Circuit Breaker Config](../src/lib/config/providers.config.ts)
- [Phase 4 Testing Plan](../product/Planning/refactoring/production-readiness-2024/PHASE_4_TESTING_HARDENING.md)
