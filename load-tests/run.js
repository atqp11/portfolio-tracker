#!/usr/bin/env node

/**
 * Load Test Runner
 * 
 * Runs Artillery load tests with configuration and generates reports
 * 
 * Usage:
 *   npm run test:load                          # Run against localhost
 *   npm run test:load -- --target http://api.example.com  # Against custom host
 *   npm run test:load -- --env production      # Load environment-specific config
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Default configuration
const defaults = {
  target: process.env.API_BASE_URL || "http://localhost:3000",
  config: path.join(__dirname, "config.yml"),
  output: path.join(__dirname, `report-${Date.now()}.json`),
  env: process.env.NODE_ENV || "development",
};

// Parse command line arguments
const args = process.argv.slice(2);
const config = { ...defaults };

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--target") {
    config.target = args[i + 1];
    i++;
  } else if (args[i] === "--config") {
    config.config = args[i + 1];
    i++;
  } else if (args[i] === "--output") {
    config.output = args[i + 1];
    i++;
  } else if (args[i] === "--env") {
    config.env = args[i + 1];
    i++;
  }
}

// Validate configuration
if (!fs.existsSync(config.config)) {
  console.error(`❌ Config file not found: ${config.config}`);
  process.exit(1);
}

console.log("================================================================================");
console.log("🚀 Artillery Load Test Runner");
console.log("================================================================================");
console.log(`📍 Target: ${config.target}`);
console.log(`📁 Config: ${config.config}`);
console.log(`📊 Output: ${config.output}`);
console.log(`🌍 Environment: ${config.env}`);
console.log("================================================================================\n");

// Check if server is running
console.log("⏳ Checking if server is running...");
try {
  execSync(`curl -s -o /dev/null -w "%{http_code}" ${config.target}/api/health`, {
    stdio: "pipe",
  });
  console.log("✅ Server is running\n");
} catch (err) {
  console.warn(
    "⚠️  Could not verify server is running. Load test may fail if server is not available.\n"
  );
}

// Build Artillery command
const cmd = [
  "artillery",
  "run",
  config.config,
  `--target ${config.target}`,
  `-o ${config.output}`,
].join(" ");

console.log("▶️  Running load test...\n");

// Run Artillery
try {
  execSync(cmd, { stdio: "inherit" });
  console.log("\n✅ Load test completed successfully");
  console.log(`📊 Results saved to: ${config.output}`);

  // Attempt to generate HTML report
  console.log("\n📈 Generating HTML report...");
  try {
    const htmlReport = config.output.replace(".json", ".html");
    execSync(`artillery report ${config.output} -o ${htmlReport}`, {
      stdio: "pipe",
    });
    console.log(`✅ HTML report: ${htmlReport}`);
  } catch (err) {
    console.warn("⚠️  Could not generate HTML report");
  }

  // Parse and display summary
  console.log("\n================================================================================");
  console.log("📊 LOAD TEST SUMMARY");
  console.log("================================================================================");
  try {
    const results = JSON.parse(fs.readFileSync(config.output, "utf-8"));
    const summary = results.aggregate;

    if (summary) {
      console.log(`✅ Total requests: ${summary.codes["200"] || 0}`);
      console.log(`❌ Failed requests: ${summary.codes["500"] || 0} / ${summary.codes["404"] || 0}`);
      if (summary.latency) {
        console.log(
          `⏱️  Latency (p95): ${summary.latency.p95}ms | Latency (p99): ${summary.latency.p99}ms`
        );
      }
      if (summary.rps) {
        console.log(
          `🔄 Throughput: ${summary.rps.mean || "unknown"} req/s | Peak: ${summary.rps.max || "unknown"} req/s`
        );
      }
    }
  } catch (err) {
    console.log("⚠️  Could not parse results");
  }

  console.log("================================================================================\n");
  process.exit(0);
} catch (err) {
  console.error("\n❌ Load test failed");
  console.error(err.message);
  process.exit(1);
}
