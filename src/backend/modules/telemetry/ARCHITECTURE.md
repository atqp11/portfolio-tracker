# Telemetry Module - Strict MVC Architecture

This module follows the strict MVC pattern as specified in the coding guidelines.

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Page (Server Component)                    │
│  - MUST call controller methods, NOT services or repos        │
│  - MUST use authGuard() for protected pages                   │
│  - MUST not contain business logic or mapping                  │
└─────────────────┬─────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Controller Layer                          │
│  - MUST validate input using Zod schemas in /zod             │
│  - MUST call service layer                                   │
│  - MUST return DTOs defined in /dto                          │
│  - MUST NOT directly query DB                                │
│  - MUST NOT implement business logic                          │
└─────────────────┬─────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                             │
│  - MUST implement domain/business logic                      │
│  - MUST call repositories                                     │
│  - MUST use mappers for DB→DTO conversion                    │
│  - MUST NOT contain Zod validation                           │
│  - MUST NOT return raw DB rows to controllers                │
└─────────────────┬─────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                  Repository Layer                             │
│  - MUST query DB (Prisma/Supabase/etc)                       │
│  - MUST return raw DB models                                 │
│  - MUST NOT apply DTO conversion                             │
│  - MUST NOT use Zod                                          │
└─────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
src/backend/modules/telemetry/
├── controllers/
│   └── telemetry.controller.ts    # HTTP & page entry points
├── services/
│   └── telemetry.service.ts        # Business logic
├── repositories/
│   └── telemetry.repository.ts     # DB access
├── mappers/
│   └── telemetry.mapper.ts         # DB ↔ DTO conversion
├── dto/
│   └── telemetry.dto.ts            # Type definitions
└── zod/
    └── telemetry.schemas.ts         # Zod validation schemas
```

## Data Flow

### 1. Page → Controller

**File:** `app/(protected)/admin/costs/page.tsx`

```typescript
// ✅ GOOD - Page calls controller
const telemetryData = await telemetryController.getTelemetryStats({
  period: periodParam,
});

// ❌ BAD - Page calls service directly
const telemetryData = await telemetryService.getTelemetryStats(period);
```

**Responsibilities:**
- Auth guard (requireUser, getUserProfile)
- Extract searchParams
- Call controller method
- Pass DTO to Client Component

### 2. Controller → Service

**File:** `src/backend/modules/telemetry/telemetry.controller.ts`

```typescript
async getTelemetryStats(params: GetTelemetryStatsRequest): Promise<TelemetryResponseDto> {
  // 1. Validate input with Zod (from /zod)
  const validatedParams = getTelemetryStatsRequestSchema.parse(params);

  // 2. Call service layer
  const result = await telemetryService.getTelemetryStats(validatedParams.period);

  // 3. Validate response with Zod (output guard)
  const validatedResponse = telemetryResponseSchema.parse(result);

  // 4. Return DTO
  return validatedResponse;
}
```

**Responsibilities:**
- Validate input with Zod schemas
- Call service layer
- Validate output with Zod (output guard)
- Return DTO

### 3. Service → Repository → Mapper

**File:** `src/backend/modules/telemetry/service/telemetry.service.ts`

```typescript
async getTelemetryStats(period: TelemetryPeriod): Promise<TelemetryResponseDto> {
  // 1. Business logic: Calculate date range
  const { startDate, endDate } = this.calculateDateRange(period);

  // 2. Call repository (raw DB model)
  const rawLogs = await telemetryRepository.findByDateRange(startDate, endDate);

  // 3. Use mapper for DB→DTO conversion
  const stats = mapLogsToStatsDto(rawLogs, startDate, endDate);

  // 4. Business logic: Check thresholds
  const warnings = checkMetricThresholds({ ...stats });

  // 5. Return DTO
  return { period, stats, warnings };
}
```

**Responsibilities:**
- Implement business logic
- Call repositories
- Use mappers for DB→DTO conversion
- Return DTOs (never raw DB models)

### 4. Repository → DB

**File:** `src/backend/modules/telemetry/repository/telemetry.repository.ts`

```typescript
async findByDateRange(startDate: Date, endDate: Date): Promise<TelemetryLogRaw[]> {
  const allLogs = await this.findAll();
  return allLogs.filter(
    (log) => log.timestamp >= startDate && log.timestamp <= endDate
  );
}
```

**Responsibilities:**
- Query DB (in-memory logs in this case)
- Return raw DB models
- No transformation, no Zod

### 5. Mapper: DB → DTO

**File:** `src/backend/modules/telemetry/mappers/telemetry.mapper.ts`

```typescript
export function mapLogsToStatsDto(
  logs: TelemetryLogRaw[],
  startDate: Date,
  endDate: Date
): TelemetryStatsDto {
  // Pure function - no side effects
  // Transforms raw DB model to DTO
  // ...
}
```

**Responsibilities:**
- Pure functions (no side effects)
- DB → DTO conversion
- DTO → DB conversion (for mutations)
- Used by services only

## Key Principles

### ✅ DO

- **Pages** call controllers
- **Controllers** validate with Zod, call services, return DTOs
- **Services** implement business logic, use mappers, call repos
- **Repositories** query DB, return raw models
- **Mappers** convert DB ↔ DTO (pure functions)
- **Zod schemas** in `/zod` directory

### ❌ DON'T

- Pages call services or repos directly
- Controllers query DB or implement business logic
- Services contain Zod validation or return raw DB models
- Repositories apply DTO conversion or use Zod
- Mappers have side effects or are used outside services

## Validation Flow

```
Page Input (searchParams)
  ↓
Controller validates with Zod (from /zod)
  ↓
Service receives validated input
  ↓
Service uses mapper (DB → DTO)
  ↓
Controller validates output with Zod (output guard)
  ↓
Page receives validated DTO
```

## Type Safety

- **Zod schemas** provide runtime validation
- **DTO types** provide compile-time type safety
- **Input types** use `z.input<>` to allow partials (with defaults)
- **Output types** use `z.infer<>` for strict types

## Example: Complete Flow

```typescript
// 1. Page (app/(protected)/admin/costs/page.tsx)
export default async function CostTrackingDashboard({ searchParams }) {
  await requireUser(); // Auth guard
  const periodParam = extractPeriod(searchParams);
  
  // Call controller
  const data = await telemetryController.getTelemetryStats({ period: periodParam });
  return <CostDashboardClient initialData={data} />;
}

// 2. Controller (telemetry.controller.ts)
async getTelemetryStats(params) {
  const validated = getTelemetryStatsRequestSchema.parse(params); // Zod validation
  const result = await telemetryService.getTelemetryStats(validated.period);
  return telemetryResponseSchema.parse(result); // Output guard
}

// 3. Service (telemetry.service.ts)
async getTelemetryStats(period) {
  const { startDate, endDate } = this.calculateDateRange(period); // Business logic
  const rawLogs = await telemetryRepository.findByDateRange(startDate, endDate);
  const stats = mapLogsToStatsDto(rawLogs, startDate, endDate); // Mapper
  const warnings = checkMetricThresholds(stats); // Business logic
  return { period, stats, warnings };
}

// 4. Repository (telemetry.repository.ts)
async findByDateRange(startDate, endDate) {
  return logs.filter(log => log.timestamp >= startDate && log.timestamp <= endDate);
}

// 5. Mapper (telemetry.mapper.ts)
function mapLogsToStatsDto(logs, startDate, endDate) {
  // Pure function: DB model → DTO
  return { /* transformed DTO */ };
}
```

