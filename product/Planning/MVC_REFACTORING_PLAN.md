# MVC Architecture Refactoring Plan - Portfolio Tracker

## **V4 - Database-First Strategy**

---

## Executive Summary

This is a comprehensive refactoring plan to transform the portfolio tracker into a clean, layered MVC-style architecture. The primary goal is to improve testability, maintainability, and scalability.

This plan codifies a **"database-first"** architectural approach. The Supabase database schema is the absolute source of truth. This is supported by a unified strategy for **Data Transfer Objects (DTOs)** using Zod to ensure a clear and type-safe separation between the internal database structure and the public-facing API contract.

### Target Architecture & Data Flow

**Folder Structure:**
```
src/
├─ backend/
│   └─ modules/
│       └─ <domain>/
│           ├─ <entity>.controller.ts
│           ├─ <entity>.service.ts
│           └─ <entity>.repository.ts
├─ lib/
│   ├─ supabase/
│   │   └─ database.types.ts  # Auto-generated DB types
│   ├─ validators/
│   │   └─ schemas/
│   │       └─ <entity>.ts      # Zod schemas for DTOs (the API contract)
│   └─ types/
│       └─ dto.ts               # TypeScript types inferred from Zod schemas
└─ prisma/
    └─ schema.prisma            # Must be manually synced with the DB schema
```

**Data Flow & Developer Workflow:**
1.  **Absolute Source of Truth:** The schema of the live **Supabase database tables**.
2.  **DB Type Generation:** After any database schema change, developers must run `supabase gen types typescript > src/lib/supabase/database.types.ts` to update the application's internal type definitions.
3.  **Prisma Schema Sync:** After generating the types, developers must **manually update `prisma/schema.prisma`** to mirror the changes. This is a critical step to ensure the Prisma ORM does not go out of sync with the database. (The `prisma db pull` command can aid this process).
4.  **Internal Backend Types:** Backend repositories and services should rely on the types from `database.types.ts` and the Prisma Client for internal logic.
5.  **Public API Contract (DTOs):** Zod schemas in `src/lib/validators/schemas/` define the public-facing shape of data for API requests and responses. This is separate from the database schema.
6.  **API Layer:** Before sending data to the frontend, services transform internal database types into the public DTOs.

---

## Phase 1: Foundational Architecture & DTO Strategy (Week 1-2) - CRITICAL

**Goal:** Establish the architectural foundation, starting with a robust and unified strategy for data contracts (DTOs).

### 1.1: Define and Implement a Unified Data Transfer Object (DTO) Strategy
- **Priority:** **CRITICAL**
- **Task:**
    1. Establish **Zod** as the single source of truth for all **public API contracts**, located in `src/lib/validators/schemas/`.
    2. From these schemas, infer shared TypeScript types for the frontend and backend to use (e.g., in `src/lib/types/dto.ts`).
    3. Refactor one simple entity (e.g., **Tasks**) to use this new pattern end-to-end as a proof-of-concept for the entire team.
- **Rationale:** This solves the core problem of inconsistent data handling and separates the public API shape from the internal database schema.

### 1.2: Establish Backend Directory Structure
- **Priority:** **HIGH**
- **Task:** Create the new layered directory structure within `src/backend/modules/` for a single domain (e.g., "portfolio").

### 1.3: Create Base Layers and Middleware
- **Priority:** **HIGH**
- **Task:** Implement the base repository pattern, standard API response format, and essential middleware (Error Handler, Auth, etc.).

### 1.4: Testing Infrastructure
- **Priority:** **MEDIUM**
- **Task:** Set up the testing infrastructure, including data factories and database utilities.

**Time Estimate for Phase 1:** 5-7 days

---

## Phase 2: CRUD Entities Refactoring (Week 3-4) - HIGH

**Goal:** Refactor the 5 main CRUD entities using the new architecture established in Phase 1.

### 2.1: Pattern for Each Entity
- **Repository:** Create an entity-specific repository that extends the `BaseRepository`.
- **Service:** Create a service to handle all business logic, using the repository for data access and transforming internal types to DTOs.
- **DTOs & Validators:** Define `create` and `update` Zod schemas in `src/lib/validators/schemas/`.
- **Refactored Route:** The API route handler will become a thin controller, delegating all work to the service.

**Time Estimate:** 8-10 days

---

## Phase 3: Complex Services Refactoring (Week 5-6) - MEDIUM

**Goal:** Refactor complex, multi-concern routes into the proper service architecture.

**Benefits:** All these services will now benefit from the unified DTO strategy, making their data contracts clear, testable, and safe.

**Time Estimate:** 7-9 days

---

## Phase 4 & 5: Testing, QA, Documentation & Deployment (Week 7-8) - MEDIUM

**Goal:** Ensure production readiness through comprehensive testing, documentation, and a smooth deployment.

- **Testing:** The Zod-based strategy simplifies validator testing and enables more robust service-layer testing (e.g., validating the transformation from internal DB models to public DTOs).
- **Documentation:** API documentation will be easier to generate and more reliable, as the Zod schemas serve as the single source of truth for the public API shapes.

**Time Estimate:** 2 weeks

---

## Revised Timeline Summary

| Phase | Duration | Priority | Key Deliverables |
|-------|----------|----------|------------------|
| Phase 1: Foundation & DTOs | 1-2 weeks | **CRITICAL** | **Unified DTO strategy**, Base classes, Middleware |
| Phase 2: CRUD Refactoring | 1-2 weeks | HIGH | 5 entities refactored, 80+ tests |
| Phase 3: Complex Services | 1-2 weeks | MEDIUM | AI, Usage, Admin refactored |
| Phase 4/5: QA & Deploy | 2 weeks | MEDIUM | 80%+ coverage, Docs, Production Deploy |

**Total Timeline:** 6-8 weeks

---
*The remainder of the original document's details (Risk Mitigation, Code Examples, etc.) are still relevant but should be interpreted through the lens of this "database-first" strategy.*
