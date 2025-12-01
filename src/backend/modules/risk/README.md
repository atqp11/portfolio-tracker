# Risk Metrics Module

Provides risk metric calculations for portfolios using `@lib/calculator`.

Files:
- `dto/risk.dto.ts` - Zod schemas and types for request/response
- `service/risk.service.ts` - Business logic and cache key generation
- `risk.controller.ts` - HTTP controller, auth and quota enforcement
- `__tests__/` - Unit & integration tests

API:
- POST `/api/risk-metrics` - body: `{ portfolioReturns: number[], marketReturns: number[], optional fields... }`
- Returns risk metrics JSON

Notes:
- Uses in-memory caching (6 hour TTL). Cached responses do not count against quota.
- Service layer is framework-agnostic and can be reused by mobile or other callers.
