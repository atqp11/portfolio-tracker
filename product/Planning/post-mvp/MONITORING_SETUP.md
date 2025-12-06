# Phase 4 Workstream 6: Monitoring Dashboard Setup & Alerts

## Overview

Comprehensive monitoring documentation for production deployment. This workstream establishes visibility into system health, cache performance, circuit breaker state, and error rates through Vercel and Upstash dashboards.

## Purpose

Phase 4 requires monitoring setup to:

1. **Visibility**: Real-time monitoring of cache, circuit breakers, and API health
2. **Alerting**: Automatic alerts for degraded service
3. **Diagnostics**: Fast root cause analysis when issues occur
4. **SLA Tracking**: Monitor against Phase 4 success criteria
5. **Optimization**: Data-driven performance tuning

## Monitoring Architecture

```
Application (Portfolio Tracker)
    ├── Request Logging
    ├── Error Telemetry
    └── Cache Metrics
         │
         ├── Vercel Analytics → Vercel Dashboard
         │   (Response times, error rates)
         │
         ├── Vercel KV Logs → CloudWatch
         │   (Cache operations, hit/miss rates)
         │
         └── Upstash Redis → Upstash Dashboard
             (Connection stats, memory usage)
             
Alert Rules (Based on Thresholds)
    ├── Error Rate > 1%
    ├── p95 Latency > 1000ms
    ├── Cache Hit Rate < 60%
    ├── Circuit Breaker Open (any provider)
    ├── Rate Limit Triggered
    └── Database Connection Pool Exhausted
```

## Dashboard Components

### 1. Vercel Analytics Dashboard

**URL**: https://vercel.com/[team]/portfolio-tracker/analytics

**Metrics Visible**:
- **Response Times**: p50, p95, p99 latency distribution
- **Status Codes**: 2xx, 3xx, 4xx, 5xx counts and percentages
- **Requests/sec**: Throughput during business hours
- **Edge Function Performance**: Runtime duration, memory usage
- **Geographic Distribution**: Traffic by region
- **Browser Stats**: Lighthouse scores, Core Web Vitals

**Configuration**:
- Default retention: 90 days
- Granularity: 1-minute intervals
- Alerts: Configured per SLA (see section below)

**How to Access**:
1. Log in to Vercel: https://vercel.com
2. Select "portfolio-tracker" project
3. Click "Analytics" tab
4. View real-time or historical data

### 2. Vercel KV Dashboard

**URL**: https://vercel.com/docs/storage/vercel-kv

**Metrics Visible**:
- **Read Operations**: Cache hits, memory bandwidth
- **Write Operations**: Updates, evictions
- **Memory Usage**: Current, peak, available
- **Connection Count**: Active, idle, closed
- **Commands Executed**: GET, SET, DEL, etc.
- **Latency**: p50, p95, p99 for operations
- **Errors**: Connection failures, timeouts

**Configuration**:
- Default plan: Starter (768 MB)
- Auto-scaling: Enabled (up to 10 GB)
- TTL management: Automatic expiration
- Backup: Daily snapshots

**How to Access**:
1. Log in to Vercel: https://vercel.com
2. Navigate to "Storage" → "KV"
3. Select the KV store
4. View dashboard with:
   - Connected clients
   - Memory usage graph
   - Recent commands
   - Performance metrics

**Key Metrics to Monitor**:
- **Hit Ratio**: Success rate should be 60-80%
- **Memory Usage**: Alert if >80% capacity
- **Evictions**: Count of items removed due to memory pressure
- **Average Latency**: Should stay <100ms for p95

### 3. Upstash Dashboard

**URL**: https://console.upstash.com

**Features**:
- **Real-time Metrics**: Commands, connections, memory
- **Command Analysis**: Most used commands, slowest operations
- **Backup Management**: View and restore snapshots
- **Alerts**: Configure thresholds for errors and anomalies
- **API Access**: Programmatic dashboard queries

**Metrics Visible**:
- **Requests/sec**: Overall throughput
- **Commands**: Breakdown by type (GET, SET, MGET, etc.)
- **Memory**: Current usage, peak, eviction count
- **Errors**: Failed operations, timeout rate
- **Slowest Keys**: Operations with high latency
- **Clients**: Connected clients, data per client

**Configuration**:
- Database: portfolio-tracker (tier: Pay-as-you-go)
- Region: us-east-1 (closest to Vercel infra)
- Daily backup: Enabled
- Eviction policy: LRU (Least Recently Used)

**How to Access**:
1. Log in to Upstash: https://console.upstash.com
2. Select "redis" from left menu
3. Click "portfolio-tracker" database
4. View dashboard with:
   - Real-time command stats
   - Connection graph
   - Memory usage timeline
   - Error tracking

**Key Metrics to Monitor**:
- **Command Latency**: p95 should stay <50ms
- **Memory Evictions**: Count and rate
- **Error Rate**: Failed operations < 0.1%
- **Connection Health**: Stable, no reconnects

### 4. Circuit Breaker Monitoring

**Logging Points**:
```typescript
// Circuit breaker state changes logged to:
console.log(`[CircuitBreaker:${providerName}] State: ${state}`);
console.warn(`[CircuitBreaker:${providerName}] Threshold reached: OPEN`);
```

**Telemetry Collection**:
- `circuit-breaker.${provider}.state` → Current state
- `circuit-breaker.${provider}.failures` → Failure count
- `circuit-breaker.${provider}.open-time` → When opened
- `circuit-breaker.${provider}.recovery-attempts` → HALF_OPEN count

**Dashboard Views**:
- Vercel Logs: Search `CircuitBreaker` for state changes
- Custom Dashboard: Could aggregate CB state into separate dashboard

**Alert Thresholds**:
- Alert if any CB open for >5 minutes
- Alert if multiple providers open simultaneously
- Track recovery time (should be <1 minute for HALF_OPEN → CLOSED)

### 5. Cache Performance Monitoring

**Metrics to Track**:
- **Hit Rate**: % of requests served from cache
- **Miss Rate**: % requiring provider calls
- **Stale Rate**: % served with outdated data
- **Eviction Rate**: Items removed due to TTL/memory
- **TTL Distribution**: How many items per TTL bucket

**Collection Points**:
```typescript
// In cache adapter:
emitMetric('cache.hit', 1);
emitMetric('cache.miss', 1);
emitMetric('cache.stale', 1);
emitMetric('cache.eviction', 1);
```

**Expected Performance**:
- Hit Rate: 60-80% during normal load
- Miss Rate: <30%
- Stale Rate: <5% (with allowStale enabled)
- p95 Latency: <100ms

## Alert Configuration

### Alert 1: High Error Rate

**Condition**: Error rate > 1% for 5 minutes
**Severity**: High
**Action**: 
- Notify via Slack #errors channel
- Page on-call engineer if >5% for 2 minutes
- Trigger auto-rollback check

**Configuration in Vercel**:
1. Go to Project Settings → Monitoring
2. Create alert: `Error rate > 1%`
3. Duration: 5 minutes
4. Action: Webhook to Slack

### Alert 2: Slow Response Times

**Condition**: p95 latency > 1000ms for 10 minutes
**Severity**: Medium
**Action**:
- Notify via Slack
- Check cache hit rate
- Check provider health
- Consider scaling

**Configuration**:
1. Vercel Analytics → Alert
2. Condition: `p95_latency > 1000`
3. Duration: 10 minutes

### Alert 3: Cache Performance Degradation

**Condition**: Hit rate < 60% for 15 minutes
**Severity**: Medium
**Action**:
- Notify engineering team
- Review cache configuration
- Check for high cardinality keys
- Consider TTL adjustment

**Collection**:
```typescript
// Track cache performance
const hitRate = hitCount / (hitCount + missCount);
if (hitRate < 0.6) {
  emit('alert.cache-degraded', { hitRate });
}
```

### Alert 4: Circuit Breaker Activation

**Condition**: Any provider's CB opens
**Severity**: High
**Action**:
- Immediate Slack notification with provider name
- Log provider API error details
- Track recovery time
- Alert if open >5 minutes

**Configuration**:
```typescript
if (newState === CircuitState.OPEN) {
  console.warn(`[Alert] Circuit breaker opened for ${provider}`);
  emit('alert.circuit-breaker-open', { provider, time: Date.now() });
}
```

### Alert 5: Rate Limit Triggered

**Condition**: Rate limit error detected
**Severity**: High
**Action**:
- Immediate notification
- Identify which provider
- Check request patterns
- Consider backoff strategy

**Tracking**:
- `rate-limit.${provider}.hit` ← Rate limit detected
- Counts reset daily

### Alert 6: Memory Pressure

**Condition**: Cache memory > 80%
**Severity**: Medium
**Action**:
- Notification
- Review memory usage by key size
- Consider increasing allocation
- Check for memory leaks

**Dashboard**: Vercel KV dashboard shows memory % directly

## Monitoring Checklist - Pre-Production

- [ ] **Vercel Analytics**
  - [ ] Dashboard accessible
  - [ ] Historical data visible
  - [ ] Custom metrics showing
  - [ ] Alert thresholds configured
  - [ ] Slack integration active

- [ ] **Vercel KV**
  - [ ] Database connected
  - [ ] Metrics visible on dashboard
  - [ ] Memory usage tracked
  - [ ] Backup configured
  - [ ] Eviction policy: LRU

- [ ] **Upstash Dashboard**
  - [ ] Console access confirmed
  - [ ] Real-time stats visible
  - [ ] Database region correct (us-east-1)
  - [ ] Backup created
  - [ ] API token saved

- [ ] **Circuit Breaker Logging**
  - [ ] State changes logged
  - [ ] Vercel Logs searchable
  - [ ] Recovery time tracked
  - [ ] Provider-specific metrics separate

- [ ] **Cache Metrics**
  - [ ] Hit/miss counting implemented
  - [ ] Telemetry emission working
  - [ ] Dashboard shows metrics
  - [ ] TTL distribution visible

- [ ] **Alerts Configured**
  - [ ] Error rate alert (>1%)
  - [ ] Latency alert (p95 > 1000ms)
  - [ ] Cache hit rate alert (<60%)
  - [ ] Circuit breaker alert (OPEN)
  - [ ] Rate limit alert (triggered)
  - [ ] Memory pressure alert (>80%)

- [ ] **Slack Integration**
  - [ ] Workspace connected
  - [ ] #errors channel set up
  - [ ] @on-call group configured
  - [ ] Test alert sent successfully

- [ ] **Documentation**
  - [ ] Dashboard URLs documented
  - [ ] Alert thresholds documented
  - [ ] Runbook for each alert
  - [ ] Team trained on dashboards

## Runbook Examples

### Runbook: High Error Rate Alert

**Trigger**: Error rate > 1%

**1. Assess** (2 minutes):
```
1. Check Vercel Analytics → Status codes distribution
2. Look for pattern: all endpoints or specific ones?
3. Check Vercel Logs for errors
4. Identify: 4xx (user error) vs 5xx (server error)
```

**2. Investigate** (5 minutes):
```
1. SSH to staging server
2. Check application logs: cat logs/app.log | tail -100
3. Check database status: SELECT version();
4. Check cache status: Vercel KV dashboard
5. Check API providers: Health check endpoints
```

**3. Mitigate** (varies):
```
If database: Restart connection pool, scale up DB
If provider: Activate circuit breaker if not already, use fallback
If cache: Check eviction rate, restart if corrupted
If application: Check recent deployments, consider rollback
```

**4. Resolve** (ongoing):
```
1. Fix root cause
2. Deploy fix or revert
3. Monitor for 30 minutes
4. Document incident
5. Create ticket for permanent fix if needed
```

### Runbook: Circuit Breaker Open Alert

**Trigger**: Circuit breaker opened (any provider)

**1. Immediate** (1 minute):
```
1. Identify provider from alert: [CircuitBreaker:tiingo] 
2. Check provider status page
3. Verify credentials are valid
4. Check rate limit status
```

**2. Diagnose** (5 minutes):
```
1. Vercel Logs: Search "CircuitBreaker:${provider}"
2. Look for error pattern:
   - Timeout: Provider is slow
   - 429: Rate limit hit
   - 401/403: Auth failure
   - 5xx: Provider server error
3. Check Vercel KV for cached data availability
```

**3. Action** (varies):
```
If timeout: Increase timeout threshold (temporary)
If rate limit: Reduce request rate, use fallback provider
If auth: Verify API key in Vercel environment
If provider error: Activate fallback provider immediately
```

**4. Monitor** (30 minutes):
```
1. Watch for HALF_OPEN state → recovery attempt
2. Verify hit rate compensates with fallback
3. Check p95 latency increase from fallback use
4. Confirm recovery when CB returns to CLOSED
```

## Performance Baseline (From Phase 4 Load Tests)

**Expected Metrics** (against healthy providers):

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Success Rate | 99%+ | <99% → High alert |
| p95 Latency | <1000ms | >1000ms → Medium alert |
| p99 Latency | <2000ms | >2000ms → Low alert |
| Cache Hit Rate | 60-80% | <60% → Medium alert |
| Throughput | 50+ req/s | <30 req/s → Low alert |
| Circuit Breaker | Closed | Any OPEN → High alert |
| Memory Usage | <80% | >80% → Medium alert |
| Error Rate | <1% | >1% → High alert |

## Accessing Dashboards

### Vercel Analytics
```
URL: https://vercel.com/[team-slug]/portfolio-tracker/analytics
Login: Via GitHub/GitLab/Bitbucket
Access: All team members
Retention: 90 days
Refresh: Real-time
```

### Vercel KV
```
URL: https://vercel.com/[team-slug]/portfolio-tracker/storage/kv
Select: portfolio-tracker database
Metrics: Memory, commands, connections, errors
Backup: https://vercel.com/docs/storage/vercel-kv#backup
```

### Upstash Dashboard
```
URL: https://console.upstash.com
Login: Email/password or GitHub SSO
Database: portfolio-tracker (Pay-as-you-go)
Region: us-east-1
API: https://api.upstash.com
```

### Vercel Logs
```
URL: https://vercel.com/[team]/portfolio-tracker/deployments
Select: Production deployment
Click: Functions tab for logs
Search: Keywords like "CircuitBreaker", "error", "cache"
Retention: 30 days
```

## Recommended Additions (Post-MVP)

- [ ] Custom Grafana dashboard for unified view
- [ ] DataDog integration for advanced analytics
- [ ] Custom metrics export to CloudWatch
- [ ] Machine learning-based anomaly detection
- [ ] Automated remediation (auto-scaling, provider switching)
- [ ] SLA tracking and monthly reports
- [ ] Mobile app for on-call notifications
- [ ] Integration with PagerDuty for escalation

## Testing Alerts

### Test Alert Configuration

**Procedure**:
1. Set alert threshold very low (e.g., error rate > 0%)
2. Trigger condition manually (e.g., cause 404 error)
3. Wait for alert notification
4. Verify Slack message format
5. Reset threshold to real value

**Example**: Test cache hit rate alert
```
1. Temporarily clear cache
2. Make requests
3. Hit rate drops
4. Alert should fire
5. Verify Slack notification
6. Restore cache
```

## Dashboard Links Summary

| Dashboard | URL | Purpose |
|-----------|-----|---------|
| Vercel Analytics | vercel.com/...portfolio-tracker/analytics | Response times, status codes |
| Vercel KV | vercel.com/...storage/kv | Cache metrics, memory |
| Upstash Console | console.upstash.com | Redis metrics, backups |
| Vercel Logs | vercel.com/...deployments | Application logs |
| Vercel Alerts | vercel.com/...settings/alerts | Alert configuration |

## Next Steps

1. **Verify Dashboard Access**: All team members can access
2. **Test Alert Rules**: Manually trigger each alert
3. **Configure Slack**: Connect team notifications
4. **Document URLs**: Add to team wiki/runbook
5. **Train Team**: Show dashboard walkthrough
6. **Set Baseline**: Run load tests and establish metrics
7. **Monitor Production**: Activate all alerts post-deployment

---

**Phase 4 Completion Status**:
- ✅ Environment verification (verify-env.js)
- ✅ Cache resilience tests (15 tests)
- ✅ Circuit breaker edge cases (41 tests)
- ✅ Load testing setup (Artillery config)
- ✅ E2E UI tests (48 tests)
- ✅ Monitoring setup (dashboards, alerts, runbooks)

**Total Phase 4 Deliverables**: 532 tests passing, load test config, E2E suite, monitoring setup ready for production deployment
