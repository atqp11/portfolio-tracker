/**
 * Artillery Processor Script
 * 
 * Provides custom functions for load test scenarios:
 * - Request preprocessing
 * - Dynamic variable generation
 * - Response validation and metrics collection
 */

// List of stock symbols for random selection
const SYMBOLS = ["AAPL", "MSFT", "GOOGL", "TSLA", "AMZN", "NVDA", "META", "NFLX"];
const COMMODITIES = ["gold", "silver", "oil", "copper", "natural_gas", "wheat"];

/**
 * Selects a random element from an array
 */
function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Before each request - preprocessing
 */
function beforeRequest(requestParams, context, ee, next) {
  // Add custom headers
  requestParams.headers = requestParams.headers || {};
  requestParams.headers["X-Load-Test"] = "true";
  requestParams.headers["X-Test-Run-ID"] = context.vars.testRunId || "unknown";

  // Add timing metadata
  context.startTime = Date.now();

  return next();
}

/**
 * After each request - response processing and metric collection
 */
function afterResponse(requestParams, response, context, ee, next) {
  const duration = Date.now() - context.startTime;
  const isSuccess = response.statusCode >= 200 && response.statusCode < 300;

  // Emit custom metrics
  ee.emit("counter", "http.request.duration", duration);
  
  if (isSuccess) {
    ee.emit("counter", "http.request.success", 1);
  } else {
    ee.emit("counter", "http.request.failure", 1);
    ee.emit("counter", `http.status.${response.statusCode}`, 1);
  }

  // Track cache headers if present
  if (response.headers["x-cache-status"]) {
    const cacheStatus = response.headers["x-cache-status"];
    ee.emit("counter", `cache.${cacheStatus.toLowerCase()}`, 1);
  }

  // Track circuit breaker state if present
  if (response.headers["x-circuit-breaker-state"]) {
    const cbState = response.headers["x-circuit-breaker-state"];
    ee.emit("counter", `circuit-breaker.${cbState.toLowerCase()}`, 1);
  }

  // Log slow requests
  if (duration > 5000) {
    console.warn(`[SLOW REQUEST] ${requestParams.method} ${requestParams.url} took ${duration}ms`);
    ee.emit("counter", "http.slow-requests", 1);
  }

  // Log errors
  if (!isSuccess) {
    console.error(`[HTTP ERROR] ${requestParams.method} ${requestParams.url} returned ${response.statusCode}`);
  }

  return next();
}

/**
 * Generate random symbol for use in tests
 */
function generateSymbol(context, ee, next) {
  context.vars.randomSymbol = randomElement(SYMBOLS);
  return next();
}

/**
 * Generate random commodity for use in tests
 */
function generateCommodity(context, ee, next) {
  context.vars.randomCommodity = randomElement(COMMODITIES);
  return next();
}

/**
 * Generate random multi-symbol list
 */
function generateSymbolList(context, ee, next) {
  const count = Math.floor(Math.random() * 3) + 1; // 1-3 symbols
  const symbols = [];
  for (let i = 0; i < count; i++) {
    symbols.push(randomElement(SYMBOLS));
  }
  context.vars.symbolList = symbols.join(",");
  return next();
}

/**
 * Test run setup - generate unique run ID
 */
function setupTestRun(context, ee, next) {
  context.vars.testRunId = `load-test-${Date.now()}`;
  context.vars.startTime = new Date().toISOString();
  return next();
}

/**
 * Custom metric aggregation
 */
function aggregateMetrics(context, ee, next) {
  // Placeholder for custom metric aggregation logic
  // Could be used to compute percentiles, generate reports, etc.
  return next();
}

// Export functions for Artillery
module.exports = {
  beforeRequest,
  afterResponse,
  generateSymbol,
  generateCommodity,
  generateSymbolList,
  setupTestRun,
  aggregateMetrics,
};
