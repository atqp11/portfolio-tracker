# Technical Architecture Overview

> **📖 PURPOSE:** Complete high-level technical architecture for the entire Portfolio Tracker system.
> **WHEN TO USE:** Understanding the full system design, tech stack, data flow, and how all components integrate.
> **UPDATE FREQUENCY:** After major architectural changes, new subsystems added, or tech stack updates.
> **AUDIENCE:** New developers, technical leads, architects, anyone needing the big picture.

**Last Updated**: 2025-11-28
**Status**: ✅ Complete & Reviewed

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Tech Stack](#tech-stack)
3. [Database Management & Client Usage](#database-management--client-usage)
4. [Architecture Layers & Data Flow](#architecture-layers--data-flow)
5. [Client-Side & Server-Side Storage & Caching Strategy](#client-side--server-side-storage--caching-strategy)
6. [Core Subsystems](#core-subsystems)
7. [External Integrations](#external-integrations)
8. [Key Design Patterns](#key-design-patterns)
9. [Detailed Documentation](#detailed-documentation)

---

## System Overview

**Portfolio Tracker** is a live portfolio management application for retail investors tracking Energy & Copper portfolios with real-time market data, AI-powered insights, risk analytics, and investment thesis tracking.

### High-Level Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                       │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  Portfolio   │  │   AI Chat    │  │  Risk        │        │
│  │  Dashboard   │  │  (StonksAI)  │  │  Analytics   │        │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │
│         │                  │                  │                 │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌────────────────────────────────────────────────────────────────┐
│               Backend (Next.js API Routes/Modules)             │
│                                                                 │
│  /api/portfolio  /api/quote  /api/ai/generate  /api/risk       │
│  /api/thesis     /api/news   /api/sec-edgar    /api/checklist  │
│                                                                 │
└─────────┬──────────────────┬──────────────────┬─────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐
│   Supabase      │  │  External APIs  │  │  AI Models       │
│   PostgreSQL    │  │  - Alpha Vantage│  │  - Llama 3.1     │
│   - Portfolios  │  │  - Polygon      │  │  - Gemini        │
│   - Stocks      │  │  - FMP          │  │  (OpenRouter)    │
│   - Users       │  │  - NewsAPI      │  │                  │
│   - Theses      │  │  - SEC EDGAR    │  │                  │
└─────────────────┘  └─────────────────┘  └──────────────────┘
```

---

## Tech Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **UI**: React 18+, Tailwind CSS
- **State Management**: React hooks, client-side state
- **Caching**: `localStorage`, `IndexedDB`
- **Charts**: Recharts

### Backend
- **Runtime**: Node.js (Next.js API routes)
- **Database**: Supabase PostgreSQL
- **ORM**: Prisma
- **Authentication**: Supabase Auth
- **Authorization**: Row-Level Security (RLS) policies

### External Services
- **Stock Data**: Alpha Vantage, FMP, Polygon
- **AI**: OpenRouter (Llama-3.1, Gemini), Google Gemini API
- **News**: NewsAPI, Brave Search, Finnhub
- **SEC Filings**: SEC EDGAR API

### Infrastructure
- **Hosting**: Vercel
- **Caching**: Vercel KV (Redis), Edge CDN
- **Storage**: Supabase Storage

---

## Database Management & Client Usage

### 🎯 Source of Truth: Supabase PostgreSQL

**⚠️ CRITICAL: Supabase PostgreSQL is the single source of truth for the database schema.**

This project uses a **hybrid database access approach**, utilizing both the Supabase and Prisma clients to connect to the same database, each for a specific purpose.

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Application                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Supabase Client (`lib/supabase/server.ts`)                  │
│  • RLS Enforced ✅                                           │
│  • Best for user-facing operations                           │
│                                                              │
│  Prisma Client (`lib/prisma.ts`)                             │
│  • RLS Bypassed ⚠️                                           │
│  • Best for admin/backend operations                         │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│         Supabase PostgreSQL (Single Database)                │
└─────────────────────────────────────────────────────────────┘
```

### Database Change Workflow

**All database schema changes MUST follow this process:**

1.  **Make Changes in Supabase**: Create or modify tables in the Supabase Dashboard (or via a migration file).
2.  **Generate Supabase Types**: Run `supabase gen types typescript > src/lib/supabase/database.types.ts` to create a TypeScript representation of the schema.
3.  **Pull Schema to Prisma**: Run `npx prisma db pull` to sync the `prisma/schema.prisma` file.
4.  **Regenerate Prisma Client**: Run `npx prisma generate` to update the Prisma Client with the new types.
5.  **Commit Changes**: Commit the updated `database.types.ts` and `prisma.schema.prisma` files.

### Decision Matrix: Which Client to Use?

| Scenario | Client to Use | Reason |
|---|---|---|
| User viewing their own portfolios | **Supabase** | RLS ensures data is automatically and securely scoped to the user. |
| Admin viewing all users | **Prisma** | Need to bypass RLS to see all data. |
| Background job updating prices | **Prisma** | No user session context; batch operations are easier. |
| Complex queries with many joins | **Prisma** | Superior type safety and developer experience for complex queries. |

---

## Architecture Layers & Data Flow

This section details the project's layered architecture, data modeling strategy, and the flow of data through the system.

### 1. Data Modeling & DTO Architecture

This system uses a strict **"database-first"** approach, complemented by a robust API contract layer using Zod.

#### 1.1 Design Principles

1.  **Supabase Database Schema is the Single Source of Truth for Data-at-Rest**
    *   **Why?** To prevent schema drift and ensure the application always reflects the true state of the database.
    *   The Supabase (PostgreSQL) database defines the authoritative structure of tables, columns, relationships, and constraints.
    *   The auto-generated types in `src/lib/supabase/database.types.ts` serve as the code-level representation of this truth for internal backend use.

2.  **Zod Schemas are the Single Source of Truth for API Contracts (DTOs)**
    *   **Why?** To create a stable, validated, and explicitly defined boundary between the frontend and backend.
    *   Zod schemas, located in `src/lib/validators/schemas/`, define the shape, types, and validation rules for all data sent to or from an API endpoint (Data-in-Motion).
    *   These schemas are **intentionally different** from the database models to decouple the API contract from the internal storage structure.

3.  **TypeScript DTO Types are Always Inferred From Zod**
    *   **Why?** To eliminate manual work and ensure the application's types can never go out of sync with its runtime validation rules.
    *   All DTO types are inferred using `z.infer<typeof ...>`, ensuring perfect alignment between validation and type safety.

#### 1.2 Final Directory Structure (Authoritative)
```
src/
├─ backend/
│   └─ modules/
│       └─ <domain>/
│           ├─ <entity>.controller.ts  # Handles API requests, validates Zod DTO
│           ├─ <entity>.service.ts     # Business logic, transforms DB models to DTOs
│           └─ <entity>.repository.ts  # Queries DB using Prisma Client
│
├─ lib/
│   ├─ supabase/
│   │   └─ database.types.ts   # Auto-generated from DB schema
│   ├─ validators/
│   │   └─ schemas/
│   │       └─ <entity>.ts         # Zod schemas = API contract
│   └─ types/
│       └─ dto.ts                # Auto-inferred DTO types from Zod
│
└─ prisma/
    └─ schema.prisma             # Must be kept in sync with Supabase DB
```

### 2. Architecture Layers (MVC)

The application follows a classic **Model-View-Controller (MVC)** pattern, with a clear separation of concerns between layers.

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer (View)                 │
│              (React Components - Client-Side)                │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   Controller Layer                           │
│              (API Routes - Request Handling)                 │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                             │
│              (Business Logic & Orchestration)                │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                  Repository Layer (DAO)                      │
│            (Data Access - DB & External APIs)                │
└─────────────────────────────────────────────────────────────┘
```

#### 2.1 Presentation Layer (View)
-   **Location:** `app/`, `components/`
-   **Description:** Consists of client-side React components that form the user interface. It is responsible for rendering data and capturing user input.
-   **Why 'use client':** The application is a highly interactive dashboard. This choice prioritizes a rich user experience, real-time updates, and complex client-side state management over server-side rendering.

#### 2.2 Controller Layer
-   **Location:** `src/backend/modules/<domain>/<entity>.controller.ts` (or directly in `app/api/.../route.ts`).
-   **Responsibilities:**
    -   Handles raw HTTP requests and responses.
    -   **Validates incoming request data** against **Zod DTO schemas**.
    -   Performs authentication and authorization checks.
    -   Calls the appropriate `Service` layer method, passing validated data.

#### 2.3 Service Layer
-   **Location:** `src/backend/modules/<domain>/<entity>.service.ts`
-   **Responsibilities:**
    -   Contains the core business logic, rules, and calculations.
    -   Orchestrates calls between different `Repository` objects.
    -   **Transforms internal database models** into **public-facing DTOs**.
    -   Manages caching strategies.

#### 2.4 Repository Layer (Data Access Object - DAO)
-   **Location:** `src/backend/modules/<domain>/<entity>.repository.ts`
-   **Responsibilities:**
    -   Encapsulates all database query logic (Prisma or Supabase Client).
    -   Handles all communication with the database and returns raw database models.

### 3. Detailed Data Flow Example

This example shows the end-to-end flow for creating a new stock entry, highlighting how data is shaped and validated at each layer.

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CLIENT                                                    │
│    Sends JSON payload: { symbol: "AAPL", shares: 100 }       │
└─────────────────┬───────────────────────────────────────────┘
                  │ Request (Untyped JSON)
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. CONTROLLER (`.../stocks.controller.ts`)                   │
│    a. Validates payload against `CreateStockRequestSchema` (Zod).│
│    b. Has a typed `CreateStockDTO` object.                     │
│    c. Calls `stockService.create(createStockDTO)`.             │
└─────────────────┬───────────────────────────────────────────┘
                  │ `CreateStockDTO`
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. SERVICE (`.../stocks.service.ts`)                         │
│    a. Receives DTO. Performs business logic.                 │
│    b. Calls `stockRepo.create(stockData)`.                    │
│    c. Receives a `Stock` (Prisma Model) from the repository. │
│    d. Transforms the Prisma Model into a `StockResponseDTO`. │
│    e. Returns `StockResponseDTO`.                            │
└─────────────────┬───────────────────────────────────────────┘
                  │ `Prisma.Stock` model
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. REPOSITORY (`.../stocks.repository.ts`)                   │
│    a. Receives data. Executes `prisma.stock.create()`.       │
│    b. Returns the new `Stock` (Prisma Model).                │
└─────────────────────────────────────────────────────────────┘
```

#### Data Shapes at Each Stage:

| Stage | Data Type | Example Shape | Source of Truth |
|---|---|---|---|
| Client → Controller | **Request DTO** | `{ "symbol": "AAPL", "shares": 100 }` | Zod Schema |
| Controller → Service | **Request DTO** | (Same as above) | Zod Schema |
| Service → Repository | `Prisma.StockCreateInput`| `{ symbol, shares, portfolioId }` | Prisma Schema |
| Repository → Service | **Prisma `Stock` Model** | `{ id, symbol, avg_price: Decimal }` | `prisma.schema` |
| Service → Controller | **Response DTO**| `{ "id": "...", "totalValue": 15000 }` | Zod Schema |
| Controller → Client | **Response DTO**| (Same as above) | Zod Schema |

### 4. Key Flow Principles

1.  **Separation of Concerns**: Controllers handle HTTP, Services handle business logic, and Repositories handle data access.
2.  **Strict Data Type Boundaries**: DTOs are the only data shapes that cross the API boundary. Internal DB Models (from Prisma/Supabase) never leave the backend.
3.  **Single Responsibility for Transformation**: The Service layer is the gatekeeper, responsible for transforming internal database models into public-facing DTOs.

---

## Client-Side & Server-Side Storage & Caching Strategy

### 4.1 LocalStorage vs IndexedDB

| Feature                     | LocalStorage                                   | IndexedDB                                              |
|-----------------------------|------------------------------------------------|--------------------------------------------------------|
| API type                    | Synchronous key-value                          | Asynchronous NoSQL object store                        |
| Data types                  | Strings only (JSON.stringify/parse)            | Native objects, Blob, File, ArrayBuffer                |
| Typical limit               | 5–10 MB per origin                             | 50–60 % of disk space (hundreds of MB–GB)              |
| Performance                 | Fast for tiny data, blocks UI thread           | Non-blocking, excellent for large/complex data        |
| Query & indexing            | Key lookup only                                | Indexes, range queries, cursors, multi-entry indexes   |
| Persistence                 | Until explicitly cleared                      | Until explicitly cleared                               |

### 4.2 Decision Matrix – Client-Side Storage

| Use Case                                    | Recommended Storage       | Rationale                                                                 |
|---------------------------------------------|---------------------------|---------------------------------------------------------------------------|
| Auth/refresh tokens                         | HttpOnly + Secure cookies | Prevents XSS theft                                                       |
| User preferences, theme, UI flags           | LocalStorage              | Small, simple, frequent access                                            |
| Feature flags, A/B tests                    | LocalStorage              | Tiny payload                                                              |
| Offline data (tasks, notes, drafts)         | IndexedDB                 | Structured, large volume                                                  |
| Large API response caching                  | IndexedDB                 | Full object support, no practical size limit                              |

### 4.3 Caching Layers Overview

| Layer                | Technology                          | Scope              | Typical TTL          | Primary Use Cases                                      |
|----------------------|-------------------------------------|--------------------|----------------------|--------------------------------------------------------|
| Browser (per user)   | LocalStorage / IndexedDB            | User-specific      | Session → years      | Offline data, preferences, personal caches.            |
| Edge/CDN             | Vercel Edge / Cloudflare            | Global             | Minutes → forever    | Static assets, public API responses.                   |
| Application instance | In-process memory (Node.js/Map)     | Single instance    | Seconds → minutes    | Short-lived, per-instance query results (Dev-only).    |
| Distributed cache    | **Redis** (Vercel KV, Upstash)      | All instances      | 10s → hours          | Shared data, sessions, rate limiting, leaderboards.    |

### 4.4 Summary Recommendation

-   **Use LocalStorage only** for tiny, non-sensitive, user-specific settings.
-   **Default to IndexedDB** for any offline capability or large client-side datasets.
-   **Use Redis** whenever data is shared across users/servers and needs fast, consistent access.
-   **Prefer HttpOnly + Secure cookies** for authentication tokens.

This layered strategy delivers maximum performance, offline resilience, horizontal scalability, and security.

---

## Core Subsystems

### 1. Authentication & Authorization
-   **Design**: Supabase Auth + Row-Level Security (RLS).
-   **Pattern**: Uses a **SSR Client** for user-scoped, RLS-protected queries and an **Admin Client** (or Prisma) to bypass RLS for system-level operations like usage tracking.

### 2. Tier & Quota System
-   **Files**: `lib/tiers/config.ts`, `lib/tiers/usage-tracker.ts`
-   **Tiers**: Free, Basic, and Premium with different limits.
-   **Enforcement**: Employs a cache-first strategy (cached responses don't use quota) and lazy period resets (no cron jobs needed).

### 3. AI System & Caching
-   **Primary Model**: Llama-3.1-70B via OpenRouter for cost-effectiveness and flexibility.
-   **Caching Strategy**: A multi-layer cache (Redis, DB, Vercel Edge) is planned to minimize latency and cost, with a target hit rate of over 80%.

---

## External Integrations

| Provider | Use Case |
|---|---|
| **Alpha Vantage / FMP**| Primary/fallback for stock quotes. |
| **Polygon.io**| Commodity prices. |
| **NewsAPI / Brave / Finnhub** | Market and financial news aggregation. |
| **SEC EDGAR API**| Official company filings (10-K, 10-Q). |
| **OpenRouter / Google Gemini** | AI models for chat and analysis. |

---

## Key Design Patterns

-   **MVC (Controller-Service-Repository):** Enforces separation of concerns, making the application modular, testable, and easier to maintain.
-   **Database-First:** The database schema is the ultimate source of truth, promoting data integrity.
-   **DTOs as API Contracts:** Zod schemas create a stable, validated boundary between the frontend and backend, independent of the internal database structure.
-   **Aggressive Caching:** Multi-layered caching is used to ensure performance and manage costs from external API calls.

---

## Detailed Documentation

For deep dives into specific subsystems, see:

-   **`docs/ARCHITECTURE.md`**: Tier system, quota enforcement, and client usage patterns.
-   **`docs/plans/generic-chasing-koala.md`**: The strategic refactoring plan.
-   **`docs/features/AI_SYSTEM_DESIGN_MVP.md`**: Implementation guide for the AI system.
-   **`README.md`**: Project setup and deployment guide.