# MVC Architecture Refactoring Plan - Portfolio Tracker

## Executive Summary

Comprehensive refactoring plan to transform the portfolio tracker from "fat controllers" with direct database access into a clean, layered MVC architecture with proper separation of concerns.

### Current State Analysis

**Critical Issues Found:**
- **27 out of 30 API routes** have direct Prisma/Supabase database access (no repository layer)
- **Business logic embedded** in route handlers (calculations, transformations, orchestration)
- **Zero test coverage** for API routes
- **5 duplicate CRUD patterns** (portfolio, stocks, thesis, checklist, tasks)
- **Inconsistent patterns**: error handling, validation, caching, response formats
- **Fat controllers**: Routes handling 5-8 concerns simultaneously (auth, validation, DB access, caching, quota, business logic, transformation, error handling)

### Target Architecture

```
Controller (Thin) → Service (Business Logic) → Repository (Data Access) → Database
         ↓                    ↓                        ↓
    Validation           Cache Layer            Prisma/Supabase
    DTO Transform        Quota Check
    Error Handling       Telemetry
```

**Key Benefits:**
- Testability: Unit test services and repositories independently
- Maintainability: Clear separation of concerns
- Reusability: Services can be used across multiple routes
- Scalability: Easy to extract services to microservices later
- Code Quality: Eliminate duplicate CRUD implementations

---

## Phase 1: Foundation & Infrastructure (Week 1-2)

**Goal:** Establish architectural foundation without breaking existing functionality.

### 1.1 Directory Structure

Create new layer directories:
```
lib/
├── repositories/
│   ├── base/
│   │   ├── base.repository.ts          # Generic CRUD operations
│   │   ├── generic-crud.repository.ts  # Pre-configured for simple entities
│   │   └── types.ts                    # Repository interfaces
│   └── [entity].repository.ts          # Specific repositories (created in Phase 2)
├── services/
│   ├── base/
│   │   └── base.service.ts             # Base service class
│   └── [domain]/                       # Domain-specific services
├── dto/
│   ├── base/
│   │   ├── response.dto.ts             # Standard API response format
│   │   └── pagination.dto.ts           # Pagination DTOs
│   └── [entity]/                       # Entity-specific DTOs
├── validators/
│   ├── base/
│   │   └── validation-rules.ts         # Reusable validation functions
│   └── [entity].validator.ts           # Entity validators
├── middleware/
│   ├── error-handler.middleware.ts     # Centralized error handling
│   ├── quota.middleware.ts             # Quota enforcement
│   ├── cache.middleware.ts             # Unified caching
│   ├── auth.middleware.ts              # Authentication wrapper
│   └── validation.middleware.ts        # Request validation
└── transformers/
    ├── base-transformer.ts             # Base transformation utilities
    └── [entity].transformer.ts         # Entity transformers
```

### 1.2 Base Repository Pattern

**File:** `lib/repositories/base/base.repository.ts`

Provides:
- Generic CRUD operations (findAll, findById, findOne, create, update, delete)
- Query filtering, pagination, sorting
- Centralized error handling
- Type-safe operations
- Transaction support

**Pattern extends existing:** Based on `lib/dao/base.dao.ts` pattern already used for external APIs.

### 1.3 Standard Response Format

**File:** `lib/dto/base/response.dto.ts`

Unified API response structure:
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: number;
    cached?: boolean;
    pagination?: PaginationMeta;
  };
}
```

### 1.4 Middleware System

Create middleware for cross-cutting concerns:

1. **Error Handler** - Centralized error formatting and logging
2. **Quota Middleware** - Integrates with existing `lib/tiers/usage-tracker.ts`
3. **Cache Middleware** - Consolidates multiple cache implementations
4. **Auth Middleware** - Wraps existing `getUserProfile()` from `lib/auth/session.ts`
5. **Validation Middleware** - Request validation with type safety

### 1.5 Testing Infrastructure

**Setup:**
- Test data factories using Faker.js
- Test database utilities (setup, reset, teardown)
- Mock Supabase client
- Jest configuration updates

**Deliverables:**
- 13 new foundational files
- Unit tests for all base classes (target: 90%+ coverage)
- Integration test setup
- All tests passing

**Time Estimate:** 5-7 days

---

## Phase 2: CRUD Entities Refactoring (Week 3-4)

**Goal:** Refactor 5 main CRUD entities using new architecture. Biggest code deduplication wins.

### 2.1 Entities to Refactor

1. **Portfolio** (`/api/portfolio` → 188 lines)
2. **Stocks** (`/api/stocks` → 163 lines)
3. **Thesis** (`/api/thesis` → 183 lines)
4. **Checklist** (`/api/checklist` → 198 lines)
5. **Tasks** (`/api/tasks` → 189 lines)

### 2.2 Pattern for Each Entity

For each entity, create:

**Repository** (`lib/repositories/[entity].repository.ts`)
- Extends `BaseRepository`
- Entity-specific queries (e.g., `findByUserId`, `findWithRelations`)
- Complex joins and aggregations
- Database access only

**Service** (`lib/services/[domain]/[entity].service.ts`)
- Extends `BaseService`
- Business logic and orchestration
- Uses repository for data access
- Cache management
- DTO transformation

**DTOs** (`lib/dto/[entity]/`)
- `create-[entity].dto.ts` - Input validation for creation
- `update-[entity].dto.ts` - Input validation for updates
- `[entity]-response.dto.ts` - Output formatting

**Validator** (`lib/validators/[entity].validator.ts`)
- Validation rules for entity
- Type-safe validation
- Reusable validation chains

**Transformer** (`lib/transformers/[entity].transformer.ts`)
- Transform DB models to API responses
- Snake_case to camelCase conversion
- Field filtering based on user permissions

**Refactored Route** (`app/api/[entity]/route.ts`)
- Thin controller (target: 40-60 lines vs current 160-190)
- Delegates to service
- Standard error handling
- Consistent response format

### 2.3 Example: Portfolio Refactoring

**Before:** `app/api/portfolio/route.ts` - 188 lines
- Direct Prisma access
- Inline validation
- Mixed concerns

**After:** ~50 lines
- Thin controller
- Delegates to `PortfolioService`
- Uses middleware for auth, quota, validation
- Standard response format

**Service:** `lib/services/portfolio/portfolio.service.ts`
```typescript
export class PortfolioService extends BaseService {
  async getUserPortfolios(userId: string): Promise<PortfolioResponse[]>
  async getPortfolioWithStats(portfolioId: string): Promise<PortfolioDetailsResponse>
  async create(dto: CreatePortfolioDTO): Promise<Portfolio>
  async update(id: string, dto: UpdatePortfolioDTO): Promise<Portfolio>
  async delete(id: string): Promise<void>
}
```

### 2.4 Testing Strategy

**Per Entity:**
- 3-5 repository unit tests
- 5-7 service unit tests (mock repository)
- 4-5 integration tests (full API flow)

**Total for Phase 2:**
- 35 new service/repository files
- 5 refactored route handlers
- 60+ unit tests
- 20+ integration tests

### 2.5 Validation

- All API endpoints work identically
- Response format backward compatible
- All tests passing
- Code coverage > 80%

**Deliverables:**
- 5 entities fully refactored (35 files)
- 80+ tests
- Reduced code duplication by ~70%
- Improved testability

**Time Estimate:** 8-10 days

---

## Phase 3: Complex Services Refactoring (Week 5-6)

**Goal:** Refactor complex routes with multiple concerns into proper service architecture.

### 3.1 Priority Routes

1. **AI Chat** (`/api/ai/chat` - 216 lines, 8 concerns)
2. **User Usage** (`/api/user/usage` - 149 lines, calculation logic)
3. **AI Generate** (`/api/ai/generate` - 177 lines, cache + routing)
4. **Admin Users** (`/api/admin/users` - complex transformations)
5. **Risk Metrics** (`/api/risk-metrics` - 130 lines, calculations)
6. **Fundamentals** (`/api/fundamentals` - 126 lines, transformations)

### 3.2 AI Chat Service Refactoring

**Current Issues:**
- 8 concerns in one file: auth, caching, quota, AI routing, generation, telemetry, error handling, formatting
- Hard to test
- Cache logic mixed with business logic

**Refactored Structure:**

**Service:** `lib/services/ai/chat.service.ts`
- Pure business logic
- No HTTP concerns
- Testable

**Components:**
- `ConfidenceRouter` - Model selection logic
- `TelemetryLogger` - Wraps existing telemetry
- `CacheService` - Unified caching

**Route:** Reduced from 216 → ~60 lines
- Auth check
- Request validation
- Quota enforcement
- Delegate to service
- Error handling

### 3.3 User Usage Service

**Current:** Calculation logic in route handler

**Refactored:**
- `UserUsageService` - Usage calculations
- `UsageRepository` - Data access for usage tracking
- `UsageTransformer` - Format usage stats

**Benefits:**
- Reusable across admin and user endpoints
- Testable calculations
- Consistent formatting

### 3.4 Admin User Management

**Refactored:**
- `AdminUserManagementService` - User management operations
- `UserRepository` - User data access
- `AuditLogger` - Track admin actions
- `AdminUserTransformer` - Format admin responses

### 3.5 Testing Strategy

**Per Service:**
- 7-10 unit tests (mock dependencies)
- 3-5 integration tests
- Performance benchmarks

**Deliverables:**
- 20 new files (services, DTOs, validators, transformers)
- 6 refactored route handlers
- 35+ tests (unit + integration)
- All functionality maintained

**Time Estimate:** 7-9 days

---

## Phase 4: Testing & Quality Assurance (Week 7)

**Goal:** Comprehensive test coverage and production readiness.

### 4.1 Testing Pyramid

```
      /\
     /E2E\         5% - End-to-end (critical flows)
    /------\
   /Integr. \     15% - Integration (API routes)
  /----------\
 /Unit Tests  \   80% - Unit (services, repos, validators)
/--------------\
```

### 4.2 Coverage Goals

- **Repositories:** 90%+ coverage
- **Services:** 85%+ coverage
- **Validators:** 100% coverage
- **Middleware:** 90%+ coverage
- **Overall:** 80%+ coverage

### 4.3 Test Infrastructure

**Test Data Factories** (`tests/factories/`)
- Factory for each entity
- Faker.js for realistic data
- Override support

**Test Database** (`tests/setup-db.ts`)
- Isolated test Supabase connection
- Migration runner
- Seed data
- Reset between tests

**Integration Tests**
- Full API flow tests
- Authentication tests
- Error scenario tests
- Performance tests

**E2E Tests**
- Complete portfolio management flow
- AI-assisted investment analysis
- Admin user management
- Quota enforcement

### 4.4 Backward Compatibility Tests

Test suite to ensure no breaking changes:
- Response structure validation
- API contract tests
- Performance regression tests

**Deliverables:**
- Test factories for all entities
- Test database utilities
- 100+ unit tests
- 30+ integration tests
- 5 E2E scenarios
- Coverage report > 80%

**Time Estimate:** 5-7 days

---

## Phase 5: Documentation & Deployment (Week 8)

**Goal:** Document architecture and deploy with zero downtime.

### 5.1 Documentation

**Architecture Docs** (`docs/architecture/`)
- MVC refactoring overview
- Layer responsibilities
- Data flow diagrams
- Design patterns used

**API Documentation** (`docs/api/`)
- All 30 endpoints
- Request/response examples
- Error codes
- Rate limits

**Development Guide** (`docs/development/`)
- How to add new endpoints
- Testing requirements
- Code style guide
- PR checklist

### 5.2 Deployment Strategy

**Pre-Deployment:**
- All tests passing
- Coverage > 80%
- Staging deployment successful
- Performance benchmarks met
- Security audit completed

**Deployment:**
1. Tag release (v2.0.0)
2. Deploy to staging
3. Smoke tests
4. Production deployment (rolling)
5. Monitor error rates
6. Verify critical paths

**Rollback Plan:**
- Revert if error rate > 5%
- Database integrity checks
- Post-mortem analysis

### 5.3 Monitoring

- API response times (P50, P95, P99)
- Error rates by endpoint
- Cache hit rates
- Database query times
- Quota usage patterns
- AI model costs

**Deliverables:**
- Complete documentation
- Deployment scripts
- Monitoring dashboards
- Production deployment

**Time Estimate:** 5-7 days

---

## Implementation Strategy

### Timeline Summary

| Phase | Duration | Priority | Key Deliverables |
|-------|----------|----------|------------------|
| Phase 1: Foundation | 1-2 weeks | CRITICAL | Base classes, middleware, testing infrastructure |
| Phase 2: CRUD Refactoring | 1-2 weeks | HIGH | 5 entities refactored, 80+ tests |
| Phase 3: Complex Services | 1-2 weeks | HIGH | AI, Usage, Admin refactored, 35+ tests |
| Phase 4: Testing & QA | 1 week | MEDIUM | 80%+ coverage, E2E tests |
| Phase 5: Docs & Deploy | 1 week | MEDIUM | Documentation, production deploy |

**Total Timeline:** 6-8 weeks (approximately 2 months)

**Minimum Viable Refactoring (MVR):** Phase 1 + Phase 2 (3-4 weeks)
- Delivers 80% of benefits
- Independently deployable
- Quick wins with CRUD consolidation

### Quick Wins

**Phase 1-2 Immediate Benefits:**
- Code duplication eliminated (5 CRUD routes consolidated)
- Consistent error handling
- Centralized validation
- Test coverage: 0% → 60%+

**Phase 3-4 Medium-Term Benefits:**
- Performance through unified caching
- Clear layer separation
- Test coverage: 60% → 85%+
- Bug reduction

**Phase 5+ Long-Term Benefits:**
- Faster onboarding
- Increased feature velocity
- Better quality
- Future scalability

### Success Metrics

**Technical:**
- 80%+ test coverage
- All 30 routes refactored
- Zero breaking changes
- Response time < 2x baseline
- Error rate < 1%

**Quality:**
- Code review approved
- All linting passing
- TypeScript strict mode
- Zero TS errors
- Complete documentation

**Business:**
- Zero downtime deployment
- User satisfaction maintained
- Feature velocity increased
- Bug rate decreased

---

## Risk Mitigation

### Breaking Changes Risk
**Mitigation:**
- Maintain backward compatibility
- Integration tests before refactoring
- Feature flags
- Gradual rollout
- Quick rollback

### Performance Regression Risk
**Mitigation:**
- Benchmark before/after
- Load testing each phase
- Production monitoring
- Performance budgets
- Rollback plan

### Timeline Overrun Risk
**Mitigation:**
- Prioritize critical paths (Phases 1-2)
- Independent deployments per phase
- Cut scope if needed
- Daily progress tracking
- Weekly stakeholder updates

### Testing Complexity Risk
**Mitigation:**
- Test data factories
- Isolated test database
- Parallel test execution
- Clear test patterns
- Pair programming

---

## Critical Files Reference

### Phase 1 - Study These Files:
- `lib/dao/base.dao.ts` - Existing DAO pattern to extend
- `lib/services/financial-data.service.ts` - Good service example
- `lib/services/stock-data.service.ts` - Service with fallback
- `lib/supabase/db.ts` - Database helpers to wrap
- `lib/tiers/index.ts` - Quota system integration

### Phase 2 - Files to Refactor:
- `app/api/portfolio/route.ts` (188 lines)
- `app/api/stocks/route.ts` (163 lines)
- `app/api/thesis/route.ts` (183 lines)
- `app/api/checklist/route.ts` (198 lines)
- `app/api/tasks/route.ts` (189 lines)

### Phase 3 - Files to Refactor:
- `app/api/ai/chat/route.ts` (216 lines, 8 concerns)
- `app/api/user/usage/route.ts` (149 lines)
- `app/api/ai/generate/route.ts` (177 lines)
- `app/api/admin/users/route.ts` (complex transformations)

### Testing - Reference:
- `tests/calculator.spec.ts` - Good test patterns
- `package.json` - Jest already configured

---

## Code Examples

### Example: Thin Controller Pattern

**Before** (160 lines):
```typescript
// Direct DB, inline validation, mixed concerns
export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.field) return error;
  const result = await prisma.model.create({...});
  return NextResponse.json(result);
}
```

**After** (40 lines):
```typescript
// Thin controller, delegates to service
export async function POST(request: NextRequest) {
  try {
    const profile = await getUserProfile();
    if (!profile) return unauthorized();

    const body = await request.json();
    const service = getService();
    const result = await service.create(body);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return ErrorHandlerMiddleware.handle(error);
  }
}
```

### Example: Service with Repository

**Service** (`lib/services/portfolio/portfolio.service.ts`):
```typescript
export class PortfolioService extends BaseService {
  constructor(
    private portfolioRepo: PortfolioRepository,
    private stockRepo: StockRepository
  ) {
    super(portfolioRepo, new PortfolioValidator());
  }

  async getUserPortfolios(userId: string): Promise<PortfolioResponse[]> {
    const portfolios = await this.portfolioRepo.findByUserId(userId);
    return portfolios.map(p => PortfolioTransformer.toResponse(p));
  }

  async getPortfolioWithStats(id: string): Promise<PortfolioDetailsResponse> {
    const portfolio = await this.portfolioRepo.findWithRelations(id);
    const stats = await this.calculateStats(portfolio);
    return PortfolioTransformer.toDetailedResponse(portfolio, stats);
  }

  private async calculateStats(portfolio: PortfolioWithRelations) {
    // Business logic for portfolio calculations
  }
}
```

**Repository** (`lib/repositories/portfolio.repository.ts`):
```typescript
export class PortfolioRepository extends BaseRepository<Portfolio> {
  protected tableName = 'portfolios';

  async findByUserId(userId: string): Promise<Portfolio[]> {
    return this.executeQuery(
      this.supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      'PortfolioRepository.findByUserId'
    );
  }
}
```

---

## Post-Refactoring Roadmap

After completing all phases:

1. **Service Extraction** - Move to separate npm packages
2. **API Versioning** - Implement v2 API
3. **GraphQL Layer** - Add GraphQL on services
4. **Microservices** - Extract high-traffic services
5. **Event-Driven** - Event bus for async operations

---

## Summary

This comprehensive plan transforms your portfolio tracker from fat controllers with direct database access into a clean, testable, maintainable MVC architecture. The phased approach minimizes risk, delivers incremental value, and ensures production stability throughout the migration.

**Key Benefits:**
- **Testability**: 0% → 80%+ test coverage
- **Maintainability**: Clear separation of concerns
- **Code Quality**: 70% reduction in duplication
- **Scalability**: Easy to extend and modify
- **Performance**: Unified caching and optimization

**Recommended Start:** Begin with Phase 1 (Foundation) to establish patterns, then Phase 2 (CRUD) for quick wins and maximum impact.
