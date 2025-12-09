# Telemetry Module - MVC Architecture

## Architecture Overview

This module follows the MVC (Model-View-Controller) pattern with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    Page (Server Component)                    │
│  - Validates input with Zod (same schema as controller)       │
│  - Calls service directly (no HTTP overhead)                  │
└─────────────────┬─────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                             │
│  - Business logic                                            │
│  - Transforms: Raw DB Model → Domain DTO                     │
│  - Returns: TelemetryResponseDto (validated domain model)     │
└─────────────────┬─────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                  Repository Layer                            │
│  - Data access (in-memory logs)                              │
│  - Returns: TelemetryLogRaw (raw DB model)                   │
│  - Ultimate source of truth                                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    API Route (Optional)                      │
│  - For external access (curl, scripts)                     │
│  - Uses Controller for HTTP handling                        │
└─────────────────┬─────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Controller Layer                          │
│  - Validates HTTP request with Zod                          │
│  - Calls service                                            │
│  - Validates response with Zod (output guard)               │
│  - Returns NextResponse (HTTP)                              │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Page → Service (RSC Pattern)

**File:** `app/(protected)/admin/costs/page.tsx`

```typescript
// 1. Validate input with Zod (same schema as controller)
const validatedParams = getTelemetryStatsRequestSchema.parse({
  period: searchParams.get('period')
});

// 2. Call service directly (no HTTP, no controller)
const telemetryData = await telemetryService.getTelemetryStats(validatedParams.period);
// Returns: TelemetryResponseDto (already validated domain model)
```

**Validation:**
- ✅ Input validated with `getTelemetryStatsRequestSchema` (Zod)
- ✅ Service returns DTO (type-safe, validated domain model)
- ✅ No HTTP overhead

### 2. Service → Repository

**File:** `src/backend/modules/telemetry/service/telemetry.service.ts`

```typescript
async getTelemetryStats(period: TelemetryPeriod): Promise<TelemetryResponseDto> {
  // 1. Fetch raw data from repository
  const rawLogs = await telemetryRepository.findByDateRange(startDate, endDate);
  // Returns: TelemetryLogRaw[] (raw DB model)

  // 2. Transform raw logs to domain DTO
  const stats = this.transformLogsToStats(rawLogs, startDate, endDate);
  // Returns: TelemetryStatsDto (domain model)

  // 3. Apply business logic (threshold checking)
  const warnings = checkMetricThresholds(stats);

  // 4. Return validated DTO
  return { period, stats, warnings };
  // Returns: TelemetryResponseDto
}
```

**Transformation:**
- ✅ Raw DB model (`TelemetryLogRaw`) → Domain DTO (`TelemetryStatsDto`)
- ✅ Business logic applied (threshold checking)
- ✅ Returns validated domain model

### 3. Repository → Data Source

**File:** `src/backend/modules/telemetry/repository/telemetry.repository.ts`

```typescript
async findByDateRange(startDate: Date, endDate: Date): Promise<TelemetryLogRaw[]> {
  const allLogs = await this.findAll();
  return allLogs.filter(
    (log) => log.timestamp >= startDate && log.timestamp <= endDate
  );
  // Returns: TelemetryLogRaw[] (raw DB model, matches storage structure)
}
```

**Data Access:**
- ✅ Returns raw data model (matches in-memory storage)
- ✅ No transformation (ultimate source of truth)
- ✅ Close to DB schema

### 4. Controller HTTP Handler (for API routes if needed)

**File:** `src/backend/modules/telemetry/telemetry.controller.ts`

```typescript
async getStats(request: NextRequest): Promise<NextResponse> {
  // 1. Extract and validate query parameters (Zod)
  const query = getTelemetryStatsQuerySchema.parse({
    period: searchParams.get('period')
  });

  // 2. Call service (same as page)
  const result = await telemetryService.getTelemetryStats(query.period);

  // 3. Validate response with Zod (output guard)
  const validatedResponse = telemetryResponseSchema.parse(result);

  // 4. Return HTTP response
  return NextResponse.json(validatedResponse);
}
```

**HTTP Handling:**
- ✅ Input validation (Zod)
- ✅ Output validation (Zod output guard)
- ✅ HTTP error handling
- ✅ Returns NextResponse

**Note:** The controller's `getStats` method can be used by API routes if external access is needed. Currently, the UI uses the service directly via RSC pages.

## Key Principles

### 1. Pages Call Services Directly (Not Controllers)

**Why:**
- Controllers are for HTTP requests/responses (NextRequest/NextResponse)
- Pages are Server Components (no HTTP context)
- Direct service calls = no HTTP overhead, better performance

**Pattern:**
```typescript
// ✅ GOOD - Page calls service
const data = await telemetryService.getTelemetryStats(period);

// ❌ BAD - Page calls controller (controller expects NextRequest)
const data = await telemetryController.getStats(request); // Won't work!
```

### 2. Validation Happens at Entry Points

**Page (RSC):**
- Validates `searchParams` with Zod schema
- Uses same schema as controller for consistency

**Controller (API Route):**
- Validates HTTP request with Zod
- Validates HTTP response with Zod (output guard)

**Service:**
- Receives validated input (from page or controller)
- Returns validated DTO (domain model)

### 3. DTO Conversion Happens in Service

**Repository:**
- Returns raw DB model (`TelemetryLogRaw`)
- No transformation

**Service:**
- Transforms raw model → Domain DTO (`TelemetryStatsDto`)
- Applies business logic
- Returns validated domain model

**Controller/Page:**
- Receives validated DTO from service
- No further transformation needed

## Type Safety Flow

```
searchParams (unknown)
  ↓ Zod validation
GetTelemetryStatsRequest (validated input)
  ↓ Service call
TelemetryResponseDto (validated domain model)
  ↓ TypeScript types
TelemetryStatsDto (type-safe DTO)
```

## Summary

- **Pages**: Validate input → Call service → Receive DTO
- **Services**: Transform DB model → Domain DTO → Apply business logic
- **Repositories**: Return raw DB model (source of truth)
- **Controllers**: HTTP validation → Call service → HTTP response validation
- **DTOs**: Type-safe domain models, validated with Zod schemas

