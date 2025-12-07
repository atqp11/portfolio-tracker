# Development Guidelines

## Project Folder Structure - Domain Modularization
Adopt a modular, domain-first folder structure. This improves code organization, makes features easier to locate, and promotes better separation of concerns.

**Example Structure:**
```
src/
├── app/
├── components/
│   ├── auth/
│   ├── dashboard/
│   ├── portfolio/
│   └── shared/
├── features/  # New: Domain-centric feature modules
│   ├── portfolio-management/
│   │   ├── components/
│   │   ├── services/
│   │   ├── actions.ts
│   │   ├── queries.ts
│   │   └── types.ts
│   ├── stock-analysis/
│   │   ├── components/
│   │   ├── services/
│   │   ├── actions.ts
│   │   └── types.ts
│   └── user-settings/
│       ├── components/
│       ├── services/
│       └── actions.ts
├── lib/
├── prisma/
└── types/
```
**Why:** Enhances discoverability, reduces coupling, and simplifies maintenance for larger teams and complex applications.

## Architecture Patterns

### Layer Separation and Responsibilities

All API endpoints must follow this standardized 5-layer architecture:

```
API Route → Middleware Stack → Controller Class → Service Layer → DAO Layer
```

#### Layer Responsibilities (Authoritative)

**Middleware Layer** (`src/backend/common/middleware/`)
- ✅ Authentication checks (`withAuth`)
- ✅ Request validation using Zod (`withValidation`)
- ✅ Quota/rate limiting (`withQuota`)
- ✅ Top-level error handling (`withErrorHandler`)
- Applied via composition in route handlers

**Controller Layer** (`src/backend/modules/[feature]/[feature].controller.ts`)
- ✅ Extract data from NextRequest/query params
- ✅ Call appropriate service method
- ✅ Format service response into NextResponse
- ✅ Set HTTP status codes
- ❌ NO business logic
- ❌ NO validation (middleware's job)
- ❌ NO quota checks (middleware's job)
- ❌ NO error handling (middleware's job)
- ❌ NO direct database access

**Service Layer** (`src/backend/modules/[feature]/service/[feature].service.ts`)
- ✅ Business rules and orchestration
- ✅ Usage tracking
- ✅ Data transformation
- ✅ External API calls
- ✅ Multi-step operations
- ✅ Domain-specific logic
- ❌ NO HTTP concerns (req/res)
- ❌ NO direct database queries (use DAO)

**DAO Layer** (`src/backend/modules/[feature]/dao/[feature].dao.ts`)
- ✅ Database queries
- ✅ ORM operations (Prisma/Supabase)
- ✅ Data mapping
- ❌ NO business logic

#### Anti-Pattern: Bloated Controllers

**Critical Rule:** Controllers must be thin. If your controller has significant logic beyond "extract → call service → format response", that logic belongs in the service layer.

```typescript
// ✅ GOOD - Thin controller
export class StockController {
  async getQuote(req: NextRequest, { query }: { query: { symbol: string } }) {
    const quote = await stockService.getQuote(query.symbol);
    return NextResponse.json({ success: true, data: quote });
  }
}

// ❌ BAD - Controller with business logic
export class StockController {
  async getQuote(req: NextRequest, { query }: { query: { symbol: string } }) {
    // ❌ Quota check belongs in middleware
    const quotaCheck = await checkQuota(userId, 'quote');
    if (!quotaCheck.allowed) throw new Error('Quota exceeded');
    
    // ❌ Data fetching and transformation belongs in service
    const quote = await alphavantageDao.fetchQuote(query.symbol);
    const enriched = this.enrichQuoteWithMetrics(quote);
    await trackUsage(userId, 'quote');
    
    return NextResponse.json({ success: true, data: enriched });
  }
}
```

**Example: Complete Stack**

```typescript
// app/api/portfolio/route.ts (Thin wrapper)
export const GET = withErrorHandler(
  withAuth(
    withValidation(undefined, getPortfolioQuerySchema)(
      (req: NextRequest, context: any) => portfolioController.get(req, context)
    )
  )
);

// src/backend/modules/portfolio/portfolio.controller.ts (HTTP concerns)
export class PortfolioController {
  async get(request: NextRequest, { query }: { query: { id?: string } }) {
    if (query.id) {
      const portfolio = await portfolioService.findById(query.id);
      return NextResponse.json({ success: true, data: portfolio });
    }
    const portfolios = await portfolioService.findAll();
    return NextResponse.json({ success: true, data: portfolios });
  }
}

// src/backend/modules/portfolio/service/portfolio.service.ts (Business logic)
class PortfolioService {
  async findById(id: string): Promise<Portfolio> {
    const portfolio = await portfolioDao.findById(id);
    if (!portfolio) throw new NotFoundError('Portfolio');
    return this.enrichWithMetrics(portfolio);
  }
}

// src/backend/modules/portfolio/dao/portfolio.dao.ts (Data access)
class PortfolioDao {
  async findById(id: string): Promise<Portfolio | null> {
    return await db.portfolio.findUnique({ where: { id } });
  }
}
```

## Code Conventions

### Import Patterns

**Always use path aliases for cross-directory imports:**

```typescript
// ✅ GOOD
import { calculatePosition } from '@lib/calculator';
import { Portfolio } from '@/types/portfolio';

// ❌ BAD
import { calculatePosition } from '../../../lib/calculator';
```

**Import order convention:**
1. Next.js imports
2. Third-party packages
3. @/ aliased imports (grouped by lib/, components/, types/)
4. Relative imports (same directory only)

### TypeScript Best Practices

**1. Always type function returns explicitly:**

```typescript
// ✅ GOOD
export async function fetchQuotes(symbols: string[]): Promise<Quote[]> {
  // ...
}

// ❌ BAD
export async function fetchQuotes(symbols: string[]) {
  // ...
}
```

**2. Use strict null checks - never assume values exist:**

```typescript
// ✅ GOOD
const price = stock.currentPrice ?? stock.avgPrice;
if (portfolio?.id) { /* ... */ }

// ❌ BAD
const price = stock.currentPrice || stock.avgPrice; // 0 is falsy!
portfolio.id // Could be null/undefined
```

**3. Avoid `any` type - use `unknown` for truly unknown types:**

```typescript
// ✅ GOOD
function parseApiResponse(data: unknown): ParsedData {
  if (isValidData(data)) return data;
  throw new Error('Invalid data');
}

// ❌ BAD
function parseApiResponse(data: any): ParsedData {
  return data;
}
```

**4. Define types for all external API responses:**

```typescript
// ✅ GOOD - in types/api.ts
export interface AlphaVantageQuote {
  '01. symbol': string;
  '05. price': string;
  '10. change percent': string;
}

// ❌ BAD - parsing without types
const symbol = data['01. symbol'];
```
---

### MVP Error Handling & Logging
Overall Philosophy (MVP)

* Clarity over Complexity: When an error occurs, it should be immediately clear what happened and where. Keep solutions simple and maintainable.
* Fail Gracefully (UI): Users should see a friendly message, not a crashed page.
* Inform Developers (Logs): All server-side errors and significant client-side errors must be logged to aid debugging.
* Consistency: Follow these patterns across the codebase for predictability.

- **Error Handling:**

    **1. View Layer (React Components: RSC & Client Components). Client-side error handling for graceful degradation:**

    Catch errors in client components and provide user-friendly feedback. Avoid displaying raw technical error messages.

    1. Implement `error.tsx` for Route Segments:
        * Purpose: Catch rendering errors within a specific route segment and display a fallback UI. Prevents an entire page from crashing.
        * Guideline: For any new or existing route segment (app/[segment]/page.tsx) that fetches data or has complex UI logic, create an app/[segment]/error.tsx file.
        * Content (MVP): A simple UI indicating "Something went wrong." with an option to reset() the error boundary.
        * Agent Instruction: When creating new pages/complex components, always check if an error.tsx is appropriate for the route segment.

        ```typescript
        // app/dashboard/error.tsx - a React Error Boundary,  Next.js's file-based convention for automatically creating a React Error Boundary for a specific part of your application.
        'use client'; // Error boundaries must be client components
        
        import { useEffect } from 'react';
        
        interface ErrorProps {
            error: Error & { digest?: string };
            reset: () => void;
        }
        
        export default function Error({ error, reset }: ErrorProps) {
        useEffect(() => {
            // Log the error to the console for MVP debugging
            // In future phases, this would send to an error tracking service (e.g., Sentry.captureException(error))
            console.error('Client-side dashboard error:', error);
        }, [error]);
        
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] bg-red-50 p-4 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-red-700 mb-2">
                Something went wrong loading your dashboard!
            </h2>
            <p className="text-red-600 mb-4">
                We're sorry for the inconvenience. Please try again.
            </p>
            <button
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                onClick={
                // Attempt to recover by trying to re-render the segment
                () => reset()
                }
            >
                Try again
            </button>
            {/* For MVP, you might also show a debug message in development */}
            {process.env.NODE_ENV === 'development' && (
                <pre className="mt-4 text-xs text-red-500 bg-red-100 p-2 rounded">
                {error.message}
                </pre>
            )}
            </div>
        );
        }

        ```
    
    2. Implement `global-error.tsx`:
        * Purpose: The ultimate fallback for errors in root layouts or uncaught errors during initial rendering.
        * Guideline: Ensure app/global-error.tsx exists and provides a very generic "Application Error" message.
        * Agent Instruction: Verify global-error.tsx exists. If not, create a basic one.
        ```typescript
            // app/global-error.tsx
            'use client'; // Global error boundaries must be client components

            import { useEffect } from 'react';

            interface GlobalErrorProps {
            error: Error & { digest?: string };
            reset: () => void;
            }

            export default function GlobalError({ error, reset }: GlobalErrorProps) {
            useEffect(() => {
                // Log the error for debugging purposes
                console.error('Global application error:', error);
            }, [error]);

            return (
                <html>
                <body>
                    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
                    <h1 className="text-3xl font-bold text-gray-800 mb-4">
                        Oops! Something went critically wrong.
                    </h1>
                    <p className="text-gray-600 mb-6 text-center">
                        We encountered an unexpected issue across the application.
                        Please refresh the page or try again later.
                    </p>
                    <button
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors"
                        onClick={() => reset()}
                    >
                        Refresh Page
                    </button>
                    {process.env.NODE_ENV === 'development' && (
                        <pre className="mt-6 text-xs text-red-500 bg-red-100 p-3 rounded-lg max-w-lg overflow-x-auto">
                        {error.message}
                        <br />
                        {error.stack}
                        </pre>
                    )}
                    </div>
                </body>
                </html>
            );
            }
        ```
    3. Not Found handling:

        ```typescript
        // app/stocks/[id]/not-found.tsx
        export default function NotFound() {
          return (
            <div>
              <h2>Stock Not Found</h2>
              <p>The stock you're looking for doesn't exist.</p>
              <a href="/portfolio">Back to Portfolio</a>
            </div>
          );
        }

        // app/stocks/[id]/page.tsx
        import { notFound } from 'next/navigation';

        export default async function StockPage({ params }: Props) {
          const stock = await prisma.stock.findUnique({
            where: { id: params.id }
          });

          if (!stock) {
            notFound(); // Triggers not-found.tsx
          }

          return <StockDisplay stock={stock} />;
        }
        ```

    **2. Controller Layer (API Routes & Server Actions)**

    1. Centralized `try...catch` for API Endpoints/Server Actions:
        * Purpose: Ensure all API endpoints and Server Actions handle errors consistently and return standardized responses.
        * Guideline: Wrap the main logic of your API routes (app/api/.../route.ts) and Server Actions ('use server') in a try...catch block.
        * Content (MVP):
            * `try`: Execute business logic.
            * `catch`:
                * Catch known custom errors (e.g., ValidationError, UserNotFoundError) and return appropriate HTTP status codes (e.g., 400, 404) with a user-friendly message.
                * Catch all other errors and return a generic 500 Internal Server Error to the client.
                * ALWAYS log the full error details on the server-side (see Logging Guidelines).
        * Agent Instruction: When implementing or modifying API routes or Server Actions, always use a try...catch block that distinguishes between known and unknown errors for response handling.

    2. Standardized JSON Error Responses:
        * Purpose: Provide a consistent format for API consumers.
        * Guideline: Error responses should be JSON objects with at least status: 'error' and a message field. Optionally, include a code for programmatic handling.
        * Example: { status: 'error', message: 'Validation failed', code: 'VALIDATION_ERROR' }
        * Agent Instruction: Ensure API error responses follow the { status: 'error', message: '...' } format.

    **3. Model/Service Layer (Prisma, external APIs, business logic)**

    1. Throw Specific Custom Errors:
        * Purpose: Allow the Controller layer to differentiate between various types of errors and handle them accordingly.
        * Guideline: When a specific, expected error condition occurs (e.g., record not found, invalid input for business logic), throw a custom error (e.g., NotFoundError, InsufficientPermissionsError).
        * Example (from your existing code): ValidationError, FileProcessingError.
        * Agent Instruction: Define and throw custom error classes for distinct, expected error conditions.

    2. Pass Through Unexpected Errors:
        * Purpose: Avoid swallowing unknown errors. Let them propagate up to the Controller layer's catch-all.
        * Guideline: Do not try...catch generic errors here unless you need to add context and re-throw a more specific error. Let unexpected errors bubble up.
        * Agent Instruction: Avoid overly broad try...catch blocks in the Model/Service layer; focus on throwing specific custom errors for known conditions.

- **Log Handling:**

    Implement structured logging for server-side operations. Ensure logs are informative without compromising user privacy or security.

    A. What to Log (MVP)
        1. Errors: All server-side errors, client-side errors caught by error.tsx, and significant warnings.
        2. Warnings: Non-critical issues that might indicate a problem or potential future error (e.g., deprecated API usage, unusual user behavior).
        3. Key Events: Important server-side actions, successful API calls (at a high level, for traffic monitoring), startup/shutdown events. Avoid verbose "debug" level logging for MVP.

    B. How to Log (MVP - Using console for speed)
    * Server-Side:
        * Use console.error() for errors.
        * Use console.warn() for warnings.
        * Use console.info() for key events and successful operations.
        * Crucial Context: When logging, always include relevant context. For errors, this means the error object itself and any relevant request details (e.g., userId, requestId, endpoint). For warnings/info, include identifiers.
        * Example: console.error('Failed to fetch user:', error, { userId: userId, apiEndpoint: '/api/users' });
        * Agent Instruction: For server-side logging, use console.error, console.warn, console.info with concise, contextual messages.

    * Client-Side:
        * Use console.error() or console.warn() as appropriate.
        * Limited Scope: Client-side console logs are primarily for local development. They won't persist in production. (See Future Considerations for production logging).
        * Agent Instruction: Use console.error for errors in client components (e.g., within error.tsx). Add console.error(error) in useEffect for error.tsx files.


    C. Security (Critical)
        1. NO PII or Sensitive Data: Never log Personally Identifiable Information (PII), user passwords, API keys, tokens, or any other sensitive data to console or any logging system.
        2. Sanitize Inputs: If you must log user inputs, ensure they are sanitized to prevent injection attacks or accidental logging of sensitive data.
        3. Agent Instruction: ABSOLUTELY AVOID logging sensitive data. Double-check all log messages for potential PII or secrets.


**Instructions for Coding Agent**
* Prioritize these guidelines when implementing or modifying code related to error handling and logging.
* Refer to existing patterns: Before introducing a new error class or logging format, check src/lib/errors.ts or src/backend/common/errors.ts (if they exist) and existing API routes for established patterns.
* Don't over-engineer: Stick to console for logging unless explicitly instructed to integrate a logging library.
* Comment on intent: If a try...catch block is omitted for brevity in a model layer (per guideline 1.C.2), add a comment explaining why it's allowed to propagate.

**Future Considerations (Phase 2 & Beyond)**

* Structured Logging Library: Replace console with a library like pino or winston for JSON-formatted logs.
    ```typescript
    // ✅ GOOD - Structured logging on the server
    // lib/logger.ts (or similar utility)
    import pino from 'pino'; // Example using pino for structured logging

    const logger = pino({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      formatters: {
        level: (label) => ({ level: label.toUpperCase() }),
      },
      timestamp: () => `,"time":"${new Date().toISOString()}"`,
    });

    // In a server function:
    logger.info({ userId: "user-123", operation: "update_portfolio", portfolioId: "abc" }, "Portfolio updated successfully.");
    logger.error({ error: err.message, stack: err.stack }, "Failed to process request for user.");

    // ❌ BAD - Logging sensitive data
    // logger.info({ userPassword: user.password }, "User login attempt.");
    ```

* Correlation IDs: Implement a mechanism to generate and pass a unique requestId through the entire request lifecycle (client -> server -> database) and include it in all log messages.
* Error Tracking Services: Integrate a dedicated error tracking service (e.g., Sentry, Bugsnag) for both client-side and server-side errors.
* Logging Aggregation: Send structured logs to a centralized logging platform (e.g., ELK stack, Datadog, CloudWatch Logs) for analysis and alerting.
* Custom Logger Utility: Create a custom logger utility that wraps the chosen library and handles log levels, PII scrubbing, etc.

---

### Component Patterns

**1. Prefer Server Components for data fetching and rendering:**

Server Components are the default in Next.js. They allow you to fetch data directly on the server, reducing the amount of JavaScript sent to the client and improving performance.

```typescript
// ✅ GOOD - Server Component fetches data directly
import { prisma } from '@lib/prisma';
import { PortfolioDisplay } from '@/components/PortfolioDisplay';

async function PortfolioPage() {
  const portfolio = await prisma.portfolio.findFirst({
    where: { type: 'energy' },
    include: { stocks: true }
  });

  return <PortfolioDisplay portfolio={portfolio} />;
}
```

**2. Use Client Components for interactivity:**

If a component requires interactivity (e.g., uses hooks like `useState`, `useEffect`, or handles browser events), you must mark it as a Client Component with the `'use client'` directive. Keep these components as small as possible.

```typescript
// ✅ GOOD - Interactive parts isolated in a Client Component
'use client';

import { useState } from 'react';

export default function InteractiveToolbar() {
  const [sortKey, setSortKey] = useState('symbol');
  // ...
}
```

**3. Keep components focused - single responsibility:**

```typescript
// ✅ GOOD - AssetCard only displays, parent handles actions
<AssetCard
  stock={stock}
  onUpdate={handleUpdate}
  onDelete={handleDelete}
/>

// ❌ BAD - AssetCard handles API calls, routing, state
<AssetCard stock={stock} /> // internally does fetch/mutations
```

### API Route & Controller Patterns

**Architectural Principle: API Routes are Thin Wrappers**

The primary principle for our backend is that API Routes (`app/api/.../route.ts`) must be "thin wrappers." Their only job is to handle the raw web request and response, delegating all business logic to a dedicated `controller` or `service` in the `src/backend/modules/` directory.

- **DO in API Route:**
    - Parse request data (e.g., `request.json()`, search parameters).
    - Call a single controller/service function.
    - Wrap the call in a generic `try...catch` to handle unexpected server errors.
    - Return a `NextResponse`.

- **DO NOT in API Route:**
    - Write complex business logic.
    - Perform detailed input validation (this belongs in the controller).
    - Create detailed error responses for specific business cases (the controller should do this).
    - Call the database directly (e.g., Prisma or Supabase client).

**Example of the Correct Pattern:**

```typescript
// ✅ GOOD: API Route as a thin wrapper
// app/api/portfolio/route.ts
import { NextResponse } from 'next/server';
import { getPortfolioForUser } from '@/src/backend/modules/portfolio/portfolio.controller';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. The API route simply delegates to the controller.
    const result = await getPortfolioForUser(request); // Pass request for auth/context
    
    // The controller handles creating the specific success/error response object
    if (result.status === 'error') {
      return NextResponse.json(result, { status: result.statusCode || 400 });
    }
    return NextResponse.json(result);

  } catch (error) {
    // 2. This catch block is for truly unexpected server errors (e.g., the controller crashes).
    console.error('Unhandled error in /api/portfolio:', error);
    return NextResponse.json(
      { status: 'error', message: 'An internal server error occurred.' },
      { status: 500 }
    );
  }
}

// src/backend/modules/portfolio/portfolio.controller.ts
// The controller contains all the logic: validation, logging, error responses.
export async function getPortfolioForUser(request: Request) {
  // 1. Authentication & Authorization
  const user = await getUserFromRequest(request);
  if (!user) {
    return { status: 'error', message: 'Unauthorized', statusCode: 401 };
  }

  // 2. Business Logic
  const portfolio = await portfolioService.findPortfolioByUserId(user.id);
  if (!portfolio) {
    return { status: 'error', message: 'Portfolio not found', statusCode: 404 };
  }
  
  // 3. Logging
  console.log(`Successfully fetched portfolio for user ${user.id}`);

  // 4. Success Response
  return { status: 'success', data: portfolio };
}
```

**Anti-Pattern: Fat API Route**
```typescript
// ❌ BAD: Bloated API Route with too much logic
// app/api/portfolio/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@lib/prisma';
import { z } from 'zod';

const PortfolioParams = z.object({ userId: z.string().uuid() });

export async function GET(request: Request) {
    // ❌ Logic that should be in a controller:
    try {
        const user = await getUser(); // Auth logic
        if(!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const validation = PortfolioParams.safeParse({ userId: user.id }); // Validation logic
        if(!validation.success) {
            return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
        }

        const portfolio = await prisma.portfolio.findFirst({ where: { userId: user.id } }); // Direct DB access
        if(!portfolio) {
            return NextResponse.json({ error: 'Not Found' }, { status: 404 });
        }

        console.log(`Fetched portfolio for user ${user.id}`); // Logging logic
        return NextResponse.json(portfolio);

    } catch(err) {
        // ... complex error handling
    }
}
```

### Hybrid Database Access Strategy

The application utilizes a hybrid approach for database access to balance security, multi-tenancy, and administrative needs. This strategy is crucial for maintaining data integrity and system security.

#### Supabase Client Usage Rules (For User-Facing Operations)

The Supabase client, which respects Row-Level Security (RLS), is the standard for all user-facing operations. This ensures users can only access their own data.

-   **Allowed Locations:**
    -   `Repository Layer (e.g., src/backend/modules/some-feature/repository.ts)`: Business logic should interact with the database via a dedicated repository layer that encapsulates data access.
-   **Forbidden Locations:**
    -   **Client Components:** Direct Supabase calls from any client components (`'use client'`) are strictly forbidden. This prevents exposing sensitive logic and ensures all queries go through RLS-protected API routes.
    -   **Frontend Hooks (`src/lib/hooks`):** Hooks must fetch data via API routes, not directly from Supabase.

#### Administrative Layer (Prisma for RLS-Bypass)

Prisma is used for specific, restricted administrative operations that require bypassing RLS.

-   **Allowed Uses:**
    -   Cron Jobs (e.g., data aggregation, cleanup).
    -   Analytics & Reporting.
    -   Cache Rebuilding.
    -   Backend Admin Dashboards.
-   **Strict Restriction:** **Never** use Prisma in user-facing API routes. Its use is confined to secure, server-side administrative contexts.

### Database Patterns (Prisma)

**1. Always use Prisma client from centralized module:**

```typescript
// ✅ GOOD
import { prisma } from '@lib/prisma';

// ❌ BAD - creating new instances
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
```

**2. Use transactions for related mutations:**

```typescript
// ✅ GOOD
await prisma.$transaction([
  prisma.stock.update({ where: { id }, data: { shares: newShares } }),
  prisma.portfolio.update({ where: { id: portfolioId }, data: { updatedAt: new Date() } })
]);

// ❌ BAD - race conditions possible
await prisma.stock.update({ where: { id }, data: { shares: newShares } });
await prisma.portfolio.update({ where: { id: portfolioId }, data: { updatedAt: new Date() } });
```

**3. Handle null values from database explicitly:**

```typescript
// ✅ GOOD
const stock = await prisma.stock.findUnique({ where: { id } });
if (!stock) {
  throw new Error('Stock not found');
}

// ❌ BAD
const stock = await prisma.stock.findUnique({ where: { id } });
const price = stock.currentPrice; // Could be null!
```

**4. Use appropriate query methods:**

```typescript
// ✅ GOOD
const stock = await prisma.stock.findUnique({ where: { id } }); // Single record
const stocks = await prisma.stock.findMany({ where: { portfolioId } }); // Multiple

// ❌ BAD
const [stock] = await prisma.stock.findMany({ where: { id } }); // Inefficient
```

### Caching Best Practices

**1. Always check cache before external API calls:**

```typescript
// ✅ GOOD
const cached = loadFromCache<Quote[]>('quotes-energy');
if (cached && getCacheAge('quotes-energy') < 5 * 60 * 1000) {
  return cached;
}

const fresh = await fetchFromAPI();
saveToCache('quotes-energy', fresh);
return fresh;

// ❌ BAD
const data = await fetchFromAPI(); // No caching
```

**2. Use descriptive cache keys with namespace pattern:**

```typescript
// ✅ GOOD
const key = `quotes-${portfolioType}-${Date.now()}`;
const key = 'commodities-energy-prices';

// ❌ BAD
const key = 'data';
const key = 'cache1';
```

**3. Track and respect rate limits:**

```typescript
// ✅ GOOD
if (isRateLimited()) {
  const cached = loadFromCache('quotes');
  if (cached) return cached;

  return NextResponse.json(
    { error: 'Rate limited, using cached data', cached: true },
    { status: 429 }
  );
}

// ❌ BAD
await fetchAPI(); // Blind calls, hit rate limits
```

### State Management

This project uses a hybrid approach to state management, separating client-side UI state from server-side cache management.

#### 1. Local UI State (`useState`, `useReducer`)

For state that is local to a component and controls its interactivity (e.g., form inputs, modal visibility, hover states), use standard React hooks.

- **Keep state as local as possible:** Only lift state to a parent component when multiple children need to share or coordinate it.
- **Use custom hooks for reusable logic:** Encapsulate complex, shared client-side logic in a custom hook (e.g., a `useSort` hook).

```typescript
// ✅ GOOD: Local state for UI interactivity
function StockCard({ stock }: Props) {
  const [isExpanded, setExpanded] = useState(false);
  // 'isExpanded' state is only used here
}
```

#### 2. Server State (Data Fetching, Caching, and Mutations)

**Primary Guideline: Use React Query (TanStack Query)**

For managing "server state"—any data fetched from, or sent to, an API—the project is standardizing on **React Query**. New features **must** use this library, and existing features should be migrated when feasible.

- **Why React Query?**
    - It eliminates complex, manual data-fetching logic using `useState` and `useEffect`.
    - It provides simple, declarative access to loading, error, and success states.
    - It handles background data synchronization, request deduplication, and caching automatically.
    - It simplifies complex UI patterns like optimistic updates.

- **Guideline:** Use `useQuery` for data fetching and `useMutation` for data modifications.

**Example `useQuery` Implementation:**

This example shows how to create a custom hook that wraps `useQuery` for fetching portfolio data.

```typescript
// lib/hooks/usePortfolio.ts (example with React Query)
import { useQuery } from '@tanstack/react-query';

// The function that performs the actual data fetching
async function fetchPortfolio(type: string) {
  const response = await fetch(`/api/portfolio?type=${type}`);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
}

// The custom hook that provides the portfolio data to components
export function usePortfolio(type: string) {
  return useQuery({
    queryKey: ['portfolio', type], // A unique key to identify and cache this query
    queryFn: () => fetchPortfolio(type),
    staleTime: 1000 * 60 * 5, // Data is considered fresh for 5 minutes
  });
}

// In a component:
// const { data: portfolio, isLoading, isError, error } = usePortfolio('energy');
// if (isLoading) return <Spinner />;
// if (isError) return <ErrorDisplay error={error} />;
```

**Legacy Pattern (To Be Phased Out):**

Older parts of the codebase may use custom hooks with `useState` and `useEffect` for data fetching. This pattern is prone to race conditions, lacks caching, and should **not** be used for new development.

```typescript
// ❌ OLD PATTERN - Avoid for new features
'use client';
import { useState, useEffect } from 'react';

function useOldPortfolio(portfolioType: string) {
    const [data, setData] = useState(null);
    const [isLoading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
      setLoading(true);
      fetch(`/api/portfolio?type=${portfolioType}`)
        .then(res => res.json())
        .then(data => setData(data))
        .catch(err => setError(err))
        .finally(() => setLoading(false));
    }, [portfolioType]);

    return { data, isLoading, error };
}
```

---

### User Experience

#### Loading States and Error Boundaries

Utilize `loading.tsx` and React `Suspense` for automatic and granular loading UIs, especially within Server Components. For client-side data fetching with React Query, use the `isLoading` and `isError` flags to render skeletons, spinners, or error messages.

#### Theme Switching Support

**Critical Requirement:** All UI components, pages, error boundaries, and loading states must support both light and dark themes. The application uses Tailwind CSS's `dark:` prefix for theme-aware styling, controlled by the `ThemeProvider` in `src/lib/contexts/ThemeContext.tsx`.

**Guidelines:**

1. **Always Provide Both Theme Variants:**
   - Never hardcode dark-only or light-only colors
   - Always use Tailwind's `dark:` prefix for dark theme variants
   - Provide appropriate light theme defaults

2. **Standard Color Patterns:**
   ```tsx
   // ✅ CORRECT - Theme-aware styling
   // Page backgrounds
   <div className="bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
   
   // Cards and containers
   <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
   
   // Text colors
   <p className="text-gray-600 dark:text-gray-300">Content</p>
   <h1 className="text-gray-900 dark:text-white">Heading</h1>
   
   // Error states
   <div className="text-red-600 dark:text-red-400">Error message</div>
   
   // Loading skeletons
   <div className="bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
   ```

3. **Required for All UI Elements:**
   - ✅ Page components (`page.tsx`)
   - ✅ Error boundaries (`error.tsx`)
   - ✅ Loading states (`loading.tsx`)
   - ✅ All reusable components
   - ✅ Modals and overlays
   - ✅ Form inputs and buttons
   - ✅ Tables and data displays

4. **Theme Provider:**
   - The app uses a custom `ThemeProvider` that adds/removes the `dark` class on the document root
   - Supports `light`, `dark`, and `auto` (system preference) modes
   - Theme preference is persisted in localStorage

5. **Common Patterns:**
   ```tsx
   // ❌ INCORRECT - Hardcoded dark theme
   <div className="bg-gray-950 text-white">
     <div className="bg-gray-900 border border-gray-800">
       <p className="text-gray-300">Content</p>
     </div>
   </div>
   
   // ✅ CORRECT - Theme-aware
   <div className="bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
     <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
       <p className="text-gray-600 dark:text-gray-300">Content</p>
     </div>
   </div>
   ```

6. **Testing Theme Support:**
   - Verify components render correctly in both light and dark modes
   - Test theme switching via the settings page
   - Ensure loading skeletons and error states are theme-aware
   - Check that all interactive elements (buttons, inputs) have proper contrast in both themes

**Pattern: Suspense Boundaries with Server Components**

```typescript
// app/dashboard/page.tsx
import { Suspense } from 'react';

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* Stocks load independently */}
      <Suspense fallback={<StocksSkeleton />}>
        <StocksData />
      </Suspense>

      {/* News loads independently */}
      <Suspense fallback={<NewsSkeleton />}>
        <NewsData />
      </Suspense>
    </div>
  );
}
```

**Pattern: Loading/Error states with React Query**
```typescript
// ✅ GOOD
const MyComponent = () => {
    const { data, isLoading, isError } = useQuery({ queryKey: ['myKey'], queryFn: fetchData });

    if (isLoading) {
      return (
          <div className="flex items-center justify-center h-64">
            <p className="mt-4 text-gray-600">Loading data...</p>
          </div>
      );
    }

    if (isError) {
      return <ErrorDisplay message="Failed to load data." />;
    }

    return (
      <div>
        {/* Render data */}
      </div>
    );
};
```

## Architectural Principles

### 0. ✅ CRITICAL: Embrace Server-First Architecture

**This is the #1 principle for this project.** This project is designed to be server-first, leveraging React Server Components (RSCs) to maximize performance and simplify data fetching.

```typescript
// ✅ GOOD - Use Server Components for data fetching
async function PortfolioPage() {
  const portfolio = await prisma.portfolio.findFirst();
  return <PortfolioDisplay portfolio={portfolio} />;
}
```

**Why this is right for this project:**
- ✅ **Performance:** Reduces client-side JavaScript, leading to faster page loads.
- ✅ **Simplified Data Fetching:** Direct access to the database (Prisma) and other server-side resources. No need for API routes for simple data retrieval.
- ✅ **Security:** Keeps sensitive data and logic on the server, never exposing it to the client.
- ✅ **Improved Developer Experience:** Write data-fetching and rendering logic in the same component.

```typescript
// ❌ BAD - Unnecessary Client-Side Fetching
'use client';

import { useState, useEffect } from 'react';

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState(null);

  useEffect(() => {
    fetch('/api/portfolio/energy')
      .then(res => res.json())
      .then(data => setPortfolio(data));
  }, []);

  // This client-side fetching pattern should be AVOIDED unless
  // the data needs to be updated in real-time without a page refresh.
  return <PortfolioDisplay portfolio={portfolio} />;
}
```

**Remember:** Client Components are for interactivity, not data fetching. Push state and events down to Client Components, but fetch data in Server Components at the top of the tree.

### Client/Server Composition Patterns.
#### **Pattern: Server Fetches, Client Interacts**

***Pass server-fetched data to client components:***

```typescript
// app/portfolio/page.tsx (Server Component)
export default async function PortfolioPage() {
  // Fetch on server
  const portfolio = await prisma.portfolio.findFirst({
    where: { type: 'energy' },
    include: { stocks: true }
  });

  const quotes = await fetchBatchQuotes(portfolio.stocks.map(s => s.symbol));

  // Pass to Client Component
  return (
    <PortfolioClient
      initialPortfolio={portfolio}
      initialQuotes={quotes}
    />
  );
}

// components/PortfolioClient.tsx (Client Component)
'use client';

export function PortfolioClient({ initialPortfolio, initialQuotes }: Props) {
  const [sortKey, setSortKey] = useState('symbol');
  const [filter, setFilter] = useState('all');

  // Client-side interactivity
  const sortedStocks = useMemo(() => {
    return [...initialPortfolio.stocks].sort((a, b) => {
      return a[sortKey] > b[sortKey] ? 1 : -1;
    });
  }, [initialPortfolio.stocks, sortKey]);

  return (
    <div>
      <SortControls sortKey={sortKey} onChange={setSortKey} />
      <StocksList stocks={sortedStocks} />
    </div>
  );
}
```

#### **Pattern: Nested Client in Server**

***Server Components can render Client Components:***

```typescript
// app/portfolio/page.tsx (Server)
export default async function PortfolioPage() {
  const portfolio = await fetchPortfolio();

  return (
    <div>
      {/* Server Component content */}
      <h1>{portfolio.name}</h1>
      <p>Total Value: ${portfolio.totalValue}</p>

      {/* Client Component for interactivity */}
      <InteractiveChart data={portfolio.history} />

      {/* More Server Component content */}
      <StocksList stocks={portfolio.stocks} />
    </div>
  );
}
```

## Anti-Patterns to Avoid

### 1. ❌ Hardcoding Configuration Values

```typescript
// ❌ BAD
const stopLoss = currentValue * 0.7;
const takeProfit = currentValue * 1.5;

// ✅ GOOD - use config
const config = configs.find(c => c.id === portfolioType);
const stopLoss = config.stopLossValue;
const takeProfit = config.takeProfitValue;
```

### 2. ❌ Mixing Business Logic in Components

```typescript
// ❌ BAD
function PortfolioCard({ stocks }: Props) {
  const totalValue = stocks.reduce((sum, s) => {
    const price = s.currentPrice ?? s.avgPrice;
    const gain = (price - s.avgPrice) / s.avgPrice;
    return sum + (price * s.shares);
  }, 0);
  // Complex calculations in component
}

// ✅ GOOD
function PortfolioCard({ stocks }: Props) {
  const metrics = usePortfolioMetrics(stocks); // Logic in hook/lib
  return <div>{metrics.totalValue}</div>;
}
```

### 3. ❌ Ignoring Error States

```typescript
// ❌ BAD
async function fetchData() {
  const res = await fetch('/api/stocks');
  const data = await res.json();
  setState(data); // What if network failed?
}

// ✅ GOOD
async function fetchData() {
  try {
    const res = await fetch('/api/stocks');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    setState(data);
    setError(null);
  } catch (err) {
    setError(classifyApiError(err));
    // Use cached data as fallback
    const cached = loadFromCache('stocks');
    if (cached) setState(cached);
  }
}
```

### 4. ❌ Not Handling Loading States

```typescript
// ❌ BAD
function StockList() {
  const { stocks } = useStocks();
  return <div>{stocks.map(s => <Stock {...s} />)}</div>;
  // Crashes if stocks is null during loading
}

// ✅ GOOD
function StockList() {
  const { stocks, loading, error } = useStocks();

  if (loading) return <Spinner />;
  if (error) return <ErrorDisplay error={error} />;
  if (!stocks?.length) return <EmptyState />;

  return <div>{stocks.map(s => <Stock key={s.id} {...s} />)}</div>;
}
```

### 5. ❌ String Concatenation for URLs/Paths

```typescript
// ❌ BAD
const url = '/api/stocks?type=' + portfolioType + '&limit=' + limit;

// ✅ GOOD
const params = new URLSearchParams({ type: portfolioType, limit: String(limit) });
const url = `/api/stocks?${params.toString()}`;
```

### 6. ❌ Silent Failures

```typescript
// ❌ BAD
try {
  await updateStock(id, data);
} catch (err) {
  // Swallowing errors
}

// ✅ GOOD
try {
  await updateStock(id, data);
} catch (err) {
  console.error('Failed to update stock:', err);
  setError(err instanceof Error ? err.message : 'Update failed');
  // Notify user, log telemetry, etc.
}
```

### 7. ❌ Mutation of Props/State

```typescript
// ❌ BAD
function updatePortfolio(portfolio: Portfolio) {
  portfolio.stocks.push(newStock); // Mutating prop!
  return portfolio;
}

// ✅ GOOD
function updatePortfolio(portfolio: Portfolio) {
  return {
    ...portfolio,
    stocks: [...portfolio.stocks, newStock]
  };
}
```

### 8. ❌ Using Index as React Key

```typescript
// ❌ BAD
{stocks.map((stock, index) => (
  <StockCard key={index} stock={stock} />
))}

// ✅ GOOD
{stocks.map((stock) => (
  <StockCard key={stock.id} stock={stock} />
))}
```

### 9. ❌ Overfetching Data

```typescript
// ❌ BAD
const portfolio = await prisma.portfolio.findUnique({
  where: { id },
  include: {
    stocks: true,
    theses: true,
    checklists: { include: { tasks: true } }
  }
}); // Fetching everything when only stocks needed

// ✅ GOOD
const portfolio = await prisma.portfolio.findUnique({
  where: { id },
  include: { stocks: true }
}); // Only fetch what's needed
```

### 10. ❌ Blocking Operations in Loops

```typescript
// ❌ BAD
for (const symbol of symbols) {
  const quote = await fetchQuote(symbol); // Sequential, slow
  quotes.push(quote);
}

// ✅ GOOD
const quotePromises = symbols.map(symbol => fetchQuote(symbol));
const quotes = await Promise.all(quotePromises); // Parallel
```

## Frontend Architecture Constraints

#### Forbidden on Frontend:
- **Direct Supabase calls:** All database interactions for users must go through API routes that enforce RLS.
- **External API calls:** (e.g., Polygon, LLMs, AlphaVantage, Finnhub, FMP, Claude, GPT-4o, Gemini) – these are strictly backend-only.
- **Environment secrets:** Sensitive keys or credentials must never be exposed on the frontend.
- **Heavy business logic:** Complex calculations and core business rules should reside in the backend or shared `src/lib` utilities.

#### Required on Frontend:
- **Data Access:** All data fetching must be performed via `/api/*` (Next.js API Routes).
- **Hooks:** Utilize hooks from `src/lib/hooks` for data fetching and reusable client-side logic.
- **Rendering Strategy:** Maintain the client-first rendering strategy for interactive pages. Only use Server Components for new static pages, documentation, or when explicitly requested.


## Next.js Specific Guidelines
- **Import Patterns:**

    **Always use path aliases for cross-directory imports:**

    ```typescript
    // ✅ GOOD
    import { calculatePosition } from ' @lib/calculator';
    import { Portfolio } from ' @/types/portfolio';

    // ❌ BAD
    import { calculatePosition } from '../../../lib/calculator';
    ```

    **Import order convention:**
    1. Next.js imports
    2. Third-party packages
    3. @/ aliased imports (grouped by lib/, components/, types/)
    4. Relative imports (same directory only)
- **File Conventions:**
    Always use these file names in the `app/` directory:

    | File | Purpose | Client/Server |
    |------|---------|---------------|
    | `page.tsx` | Route page component | Server (default) |
    | `layout.tsx` | Shared layout wrapper | Server (default) |
    | `loading.tsx` | Loading UI (Suspense fallback) | Server |
    | `error.tsx` | Error boundary | **Must be Client** |
    | `not-found.tsx` | 404 page | Server |
    | `route.ts` | API route handler | Server |
    | `template.tsx` | Re-rendered layout | Server |
    | `default.tsx` | Parallel route fallback | Server |

- **Naming Conventions:**

    Adopt a consistent and descriptive naming convention to clearly indicate the role and layer of each file.
    *   `SomethingServerSection.tsx` → Indicates a Server Component acting as a data-fetching boundary.
    *   `SomethingClient.tsx` → Clearly marks a Client Component focused on interactivity.
    *   `actions.ts` → Contains Server Actions for mutations.
    *   `queries.ts` → Houses server-side functions for data reads (often called from Server Components).
    *   `schemas.ts` → Defines Zod schemas for input validation and DTOs.
    *   `types.ts` → Declares TypeScript domain types.

- **Current project structure:**
    ```
    app/
    ├── page.tsx              # Main portfolio page ('use client')
    ├── layout.tsx            # Root layout
    ├── api/                  # API routes (Server)
    │   ├── quote/route.ts
    │   ├── portfolio/route.ts
    │   └── ...
    ├── stocks/               # Static pages
    └── test-*/               # Test pages
    ```
- **Pages are Server Components by Default:**
    All pages under `app/` must be Server Components unless browser APIs are strictly required. Avoid `use client` on pages unless absolutely justified.
    **Why:** Faster TTFB (Time To First Byte), cheaper compute, and enables more granular partial refresh boundaries. Reduces client-side JavaScript.
- **Data Fetching: Ideal Patterns for Performance and User Experience**

    While the project currently leans towards a client-first architecture, adopting modern Next.js features for data fetching, especially Server Components (RSC), offers significant benefits for performance, user experience, and maintainability.

    **1. Server Components First (SFCP) for Data Loading: Fetch data ONLY in Server Components**
    The ideal pattern leverages Server Components to fetch data on the server, eliminating the "double fetch" problem where data is initially fetched server-side for initial render, then re-fetched client-side for hydration.

    *   **No fetching in Client Components:** Client Components should not perform data fetching for core domain data.
    *   **No browser-side fetching for SSR-required data.**
    *   **No React Query/SWR for core domain data (only real-time use-cases):** Reserve client-side data fetching libraries for truly real-time, frequently updating use-cases that cannot be handled efficiently by RSC.
    *   **Eliminating Double Fetching:** Data is fetched once on the server, then passed to the client. This reduces Waterfall requests and improves Time-To-First-Byte (TTFB).
    *   **Reduced Client Bundle Size:** Data fetching logic and heavy dependencies remain on the server, reducing the amount of JavaScript shipped to the client.
    *   **Improved Performance:** By fetching data closer to the database and rendering static parts of the UI on the server, the perceived load load time is significantly reduced.

    ```typescript
    // ✅ GOOD - Server Fetch
    import "server-only"; // Ensures this module is never bundled for the client
    import { prisma } from '@/lib/prisma'; // Assuming your Prisma client

    export async function getPortfolioById(id: string) {
      const portfolio = await prisma.portfolio.findUnique({
        where: { id },
        // Add caching strategy if appropriate (e.g., revalidate: 60)
      });
      return portfolio;
    }
    ```
    **Why:** Improves security (no database access credentials on client), leverages server-side caching, and enhances performance by fetching data closer to the source.


    **2. Partial Refresh & Streaming for Perceived Performance:**
    Next.js allows for progressive rendering using `loading.tsx` and React `Suspense`. This enables parts of your UI to render as soon as their data is ready, rather than waiting for the entire page.

    * **Streaming UI from the Server:** Use `loading.tsx` at the route segment level or `<Suspense>` within components to define fallback UIs while data is loading. This prevents blocking the entire page and allows users to see content sooner.

    * **Parallel Data Fetching:** Structure your components and data fetches to run in parallel. When a component `await`s data, it suspends rendering, but other components can continue rendering if their data is ready.

      ```typescript
      
      // ✅ GOOD - Parallel fetching
      // app/portfolio/page.tsx
      import { Suspense } from 'react';
      import { fetchStockData, fetchNewsFeed } from '@/lib/server-data';
      import StockList from './StockList';
      import NewsPanel from './NewsPanel';

      export default function PortfolioPage() {
        const stocksPromise = fetchStockData(); // Initiates fetch
        const newsPromise = fetchNewsFeed();   // Initiates fetch in parallel
        // All requests start at the same time
        const [portfolioPromise, stocksPromise, newsPromise] = await Promise.all([
          fetchPortfolio(),
          fetchStocks(),
          fetchNews()
        ]);

      ----

      // ❌ BAD - Sequential fetching (waterfall)
      async function SlowDashboard() {
        const portfolioPromise = await fetchPortfolio();  // Wait
        const stocksPromise = await fetchStocks();        // Wait
        const newsPromise = await fetchNews();            // Wait
        // Total time = sum of all requests
      }

      ---
        return (
          <main>
            <Suspense fallback={<StockListSkeleton />}>
              <StockList promise={stocksPromise} />
            </Suspense>
            <Suspense fallback={<NewsPanelSkeleton />}>
              <NewsPanel promise={newsPromise} />
            </Suspense>
          </main>
        );
      }
      ```

    * **Preload with Separate Components**

      ```typescript
      // app/portfolio/page.tsx
      import { Suspense } from 'react';

      export default function PortfolioPage() {
        // Kick off requests early
        const portfolioPromise = fetchPortfolio();
        const stocksPromise = fetchStocks();

        return (
          <div>
            <Suspense fallback={<PortfolioSkeleton />}>
              <PortfolioData promise={portfolioPromise} />
            </Suspense>

            <Suspense fallback={<StocksSkeleton />}>
              <StocksData promise={stocksPromise} />
            </Suspense>
          </div>
        );
      }

      async function PortfolioData({ promise }: { promise: Promise<Portfolio> }) {
        const portfolio = await promise;
        return <PortfolioDisplay portfolio={portfolio} />;
      }
      ```

    **3. Interactivity Boundaries (`"use client"`): Client Components ONLY for interactivity**
    Client Components should be strictly limited to providing interactivity. They should never perform data fetching for core domain data.
    The `"use client"` directive marks the boundary between Server and Client Components.

    **Examples:**
    *   Sorting mechanisms
    *   Filtering UI
    *   Dropdown logic
    *   Tab navigation
    *   Complex user interactions requiring browser APIs (e.g., animations, local storage access)

    *   **Explicit Boundary:** Place `"use client"` at the top of files that need client-side interactivity (hooks, event listeners, browser APIs).
    *   **Pass Server-Fetched Data as Props:** Data fetched in Server Components can be passed down as serializable props to Client Components. Keep Client Components small and focused on interactivity.
    *   **Minimize Client Bundle Size:** Only components truly requiring client-side JavaScript should be marked `"use client"`. Move as much as possible to the server.

    ```typescript
    // ✅ GOOD - Client Component for interactivity
    'use client';

    import { useState } from 'react';
    import { useRouter } from 'next/navigation';

    export function SortButton({ initialSortOrder }: { initialSortOrder: 'asc' | 'desc' }) {
      const [sortOrder, setSortOrder] = useState(initialSortOrder);
      const router = useRouter();

      const toggleSort = () => {
        const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
        setSortOrder(newOrder);
        router.push(`?sort=${newOrder}`); // Update URL, trigger re-render of Server Components
      };

      return (
        <button onClick={toggleSort}>
          Sort: {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
        </button>
      );
    }
    ```


    **4. Optimistic UI for Enhanced Interactivity:**
    For mutations (e.g., form submissions, data updates), combine Server Actions with React's `useOptimistic` hook to provide immediate user feedback. (Refer to section 3.7 Form Handling and Mutations with Server Actions for detailed examples).

    *   **Instant Feedback:** Update the UI immediately after a user action, assuming success.
    *   **Automatic Rollback:** `useOptimistic` handles reverting the UI state if the server action fails.
    *   **Reduced Layout Shift:** Because the UI updates instantly, there's less perceived layout shift or waiting for server responses.

    **5. Preventing Layout Shift:**
    Beyond streaming, actively prevent cumulative layout shift (CLS) by:

    *   **Reserving Space:** Use CSS (e.g., `min-height`, `aspect-ratio`) to reserve space for dynamic content that loads later.
    *   **Skeletons & Placeholders:** Use `loading.tsx` or custom skeleton components to occupy the eventual space of content.

    **6. RSC Architecture Guidelines:**
    The Server Component architecture encourages a mental model where data fetching is inherent to rendering on the server.

    *   **Fetch Data Where It's Used:** Fetch data directly within the Server Component that needs it, or in server utilities called by that component.
    *   **Serialization Boundary:** Data passed from Server Components to Client Components must be serializable.
    *   **Server Graph:** Think of your application as a tree of components, with Server Components at the root rendering down to Client Components where interactivity is required.

    By adopting these patterns, the application can significantly improve its performance, reduce client-side overhead, and provide a snappier, more robust user experience.

    **7. How Server Components Handle Changing Data**
    By default, Server Components are static per request. Meaning:
    * Each time a user navigates to the page, Next.js fetches fresh data.
    * If the user stays on the page, the server does NOT auto-re-fetch the data unless:
      You manually trigger a refresh Or use caching settings that update the data over time
      Let’s break down all scenarios…

      **1. If data changes in the database**

      Depending on your caching mode, the UI may:

        **A. cache: 'no-store' → Always fresh**
        ```typescript
        const portfolio = await prisma.portfolio.findUnique({
          where: { id },
          cache: "no-store"
        });
        ```

        Behavior:
        * Every request fetches fresh DB data
        * No caching
        * Any DB change will appear immediately on:
        * Page reload
        * Route navigation
        * soft navigation (router.refresh())
        * Best for:
          * Dashboards
          * Admin panels
          * Real-time-ish finance data

        **B. revalidate: 0 → Same as no-store**
        ```typescript
        export const revalidate = 0; // dynamic
        ```

        Same behavior: always hits DB.

        **C. revalidate: 30 → Regenerates every 30s**
          ```typescript
          export const revalidate = 30;
          ```
          Behavior:
          * Next.js returns cached HTML for 30 seconds
          * After 30 seconds, next request regenerates fresh HTML
          * DB updates appear with up to 30s delay.
          * Best for:
            * Blogs
            * Slow-changing pages
            * Marketing
            * Public content

        **D. Default static caching → NEVER updates until redeploy**
          If you don’t specify a caching strategy:
          Next.js treats server components as static
          Pages are fully cached indefinitely
          DB changes will not appear until redeploy or clearing cache
          This is why most people MUST opt into dynamic data.
    
      **2. What if user is already on the page?**
      Server components only fetch on server navigation, not automatically in background.
      But you can manually re-fetch using:
      **✔ router.refresh()**

      Triggers a server re-render:
      ```typescript
      import { useRouter } from 'next/navigation';

      const router = useRouter();

      <button onClick={() => router.refresh()}>
        Refresh Data
      </button>
      ```

      Best for:
      * After a mutation
      * After user action
      * Manual refresh button

      **✔ Actions automatically refresh (Next.js 15+)**
      If you use Server Actions, the framework auto-re-fetches the affected RSC tree.

      ```typescript
      'use server';

      export async function updatePortfolio() {
        await prisma.portfolio.update(...);
      }
      ```

      Calling this from a client component will auto-trigger a refresh.

      **✔ Real-time (optional)**

      If you actually need real-time, then:
      * Use client component + SWR/react-query
      * Or websocket
      * Or Server Actions streaming
      * Server Components alone are NOT real-time.

      **3. What pattern should your portfolio app use?**
      For an investor portfolio/tracker:

      🔥 Recommended:
      ```typescript
      export const revalidate = 5; // or cache: 'no-store'
      ```

      Because:
      * Data changes moderately often
      * You want a near-real-time feel
      * Not fully static OR for guaranteed real-time:
        * Fetch in Server Component (no-store)
        * Use `<RefreshInterval />` client polling Or websocket stream for prices

      **4. Summary**
      ✔ Server Components DO update when data changes, IF:
        * You use no-store or revalidate or router.refresh() or Server Actions
      ✘ Server Components do NOT auto-update if:
        * Page uses static caching (default)
      * User stays idle on a page without refresh logic

  **8. Partial Refresh of Server Components (RSC Boundaries): Use RSC Boundaries Strategically**
    Design your component tree such that Server Components act as refreshable units. This allows for fine-grained partial re-rendering without affecting unrelated parts of the UI.

    Does Server-Side Rendering allow refreshing only one component?
    ✔ YES — if that component is a “Server Component boundary.”

    In Next.js App Router, every RSC is a unit the framework can re-render independently when triggered via:

    *   Server Actions
    *   `router.refresh()`
    *   Dynamic segments / parallel routes
    *   RSC boundaries (components that fetch in server)

    **Considerations:**
    *   Isolate data-fetching logic within specific Server Components.
    *   Use Route Segments (`@folder/component`) and nested Server Components to create explicit refreshable boundaries.

    **Examples:**
    *   Holdings list can refresh independently from a portfolio chart.
    *   A stats panel can update without re-rendering the entire summary section.
    *   Transaction logs can refresh without affecting other portfolio details.

    **Why:** Improves user experience by providing faster, more targeted updates; avoids over-fetching data; and enhances scalability by minimizing the work done on each refresh.

    But there are rules.

    **❌ What you cannot do**

    You cannot do this:

    “Only re-render `<PortfolioDisplay/>` server-side without refreshing its parent page.”

    Because client → server component interaction is one-way.
    Client components cannot directly re-request just one Server Component.

    **✅ What you can do (and what apps like Linear, Vercel Dashboard, Notion do)**
    **Option A — Refresh only a segment (BEST)**

    Split your UI into route segments so you don’t refresh the whole page.

    Example structure:

    ```
    app/portfolios/[id]/
      page.tsx
      @details/DetailsPanel.tsx
      @sidebar/Sidebar.tsx
    ```

    Now you can refresh only `/portfolios/[id]/@details/DetailsPanel.tsx`
    — the sidebar stays static.

    This is how "partial RSC refresh" works.

    **Option B — Server Action triggers partial refresh (most common)**
    ```typescript
    'use server';

    export async function updatePortfolio() {
      await prisma.portfolio.update(...);
    }
    ```

    Client component:

    ```typescript
    const action = async () => {
      await updatePortfolio();
      router.refresh(); // but only refreshes RSC boundaries, NOT whole page
    };
    ```

    Important:

    *   `router.refresh()` does not reload the entire browser page.
    *   It re-fetches only the RSC tree above the client component.

    So if your tree is:

    ```
    ServerComponent
      -> ClientComponent (button)
    ```

    Only `ServerComponent` is refreshed.

    Not the whole page, not layout, not root.

    **Option C — Use nested Server Components (local boundary)**

    If you isolate the server-fetched logic like this:

    ```typescript
    // server component
    async function PortfolioServerSection({ id }) {
      const portfolio = await prisma.portfolio.findUnique(...);
      return <PortfolioDisplay portfolio={portfolio} />;
    }

    // page
    export default function Page({ params }) {
      return (
        <>
          <Header />                // not refreshed
          <PortfolioServerSection id={params.id} />  // ONLY this section refreshes
          <Footer />                // not refreshed
        </>
      );
    }
    ```

    Then `router.refresh()` only re-runs:

    `PortfolioServerSection`, not `Header` or `Footer`.

    **❌ Why you cannot directly "refresh only this Server Component"**

    Because client components don't have the ability to tell the framework:

    “Please re-render only this RSC node.”

    Next.js abstracts hydration boundaries and treats RSC output like a stream — not individually addressable components.

    **🧠 So the actual rule is:**
    You can refresh parts of the page IF:

    *   You split UI into RSC boundaries
    *   Or use route segments
    *   Or use Server Actions
    *   Or use nested server components

    You cannot refresh arbitrary components without structuring the tree correctly.
    **🎯 Recommended Architecture For You (Portfolio Tracker App)**
    Best structure to support partial refresh:
    ```
    app/portfolios/[id]/
      page.tsx                 (static layout)
      PortfolioServerSection.tsx <-- dynamic
      components/
        PortfolioDisplay.tsx   <-- client
    ```

    Server boundary:

    ```typescript
    // PortfolioServerSection.tsx
    export default async function PortfolioServerSection({ id }) {
      const portfolio = await getPortfolio(id);
      return <PortfolioDisplay portfolio={portfolio} />;
    }
    ```

    Client:

    ```typescript
    <button onClick={() => router.refresh()}>
      Refresh Stocks Only
    </button>
    ```

    Only `PortfolioServerSection` refreshes — NOT the full page.
- **User Experience:**
    - Utilize `loading.tsx` and React `Suspense` for automatic and granular loading UIs.
- **Forms & Mutations: Server Actions for Mutations**

    Server Actions should be the primary mechanism for all data mutations, replacing traditional API routes (`app/api/*`) wherever possible.

    *   Mutations must be handled server-side.
    *   All Server Actions must include robust input validation (preferably using Zod schemas).

    **Pattern: Validate → Mutate → Revalidate**

    **The standard flow for form submissions:**

    ```typescript
    // app/actions/stocks.ts
    'use server';

    import { z } from 'zod';
    import { revalidatePath } from 'next/cache';
    import { prisma } from '@lib/prisma';

    // 1. VALIDATE - Define schema
    const UpdateStockSchema = z.object({
      stockId: z.string().cuid(),
      shares: z.number().int().positive().max(1000000),
      avgPrice: z.number().positive().max(100000)
    });

    // 2. MUTATE - Update database
    export async function updateStock(formData: FormData) {
      // Validate input
      const rawData = {
        stockId: formData.get('stockId') as string,
        shares: Number(formData.get('shares')),
        avgPrice: Number(formData.get('avgPrice'))
      };

      const validated = UpdateStockSchema.parse(rawData); // Throws on invalid

      // Mutate database
      const updated = await prisma.stock.update({
        where: { id: validated.stockId },
        data: {
          shares: validated.shares,
          avgPrice: validated.avgPrice,
          lastUpdated: new Date()
        }
      });

      // 3. REVALIDATE - Refresh cached data
      revalidatePath('/portfolio');
      revalidatePath(`/stocks/${validated.stockId}`);

      return { success: true, stock: updated };
    }
    ```

    **Client Component using the Server Action:**

    ```typescript
    // components/UpdateStockForm.tsx
    'use client';

    import { updateStock } from '@app/actions/stocks';
    import { useState } from 'react';

    export function UpdateStockForm({ stock }: Props) {
      const [error, setError] = useState<string | null>(null);
      const [pending, setPending] = useState(false);

      async function handleSubmit(formData: FormData) {
        setPending(true);
        setError(null);

        try {
          const result = await updateStock(formData);
          // Success - Next.js will automatically update UI via revalidatePath
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Update failed');
        } finally {
          setPending(false);
        }
      }

      return (
        <form action={handleSubmit}>
          <input type="hidden" name="stockId" value={stock.id} />

          <input
            type="number"
            name="shares"
            defaultValue={stock.shares}
            disabled={pending}
          />

          <input
            type="number"
            name="avgPrice"
            defaultValue={stock.avgPrice}
            disabled={pending}
            step="0.01"
          />

          <button type="submit" disabled={pending}>
            {pending ? 'Updating...' : 'Update Stock'}
          </button>

          {error && <p className="error">{error}</p>}
        </form>
      );
    }
    ```

    **Progressive Enhancement (works without JavaScript):**

    ```typescript
    // Form works even if JS is disabled
    export function ProgressiveForm({ stock }: Props) {
      return (
        <form action={updateStock}>  {/* Direct Server Action */}
          <input type="hidden" name="stockId" value={stock.id} />
          <input type="number" name="shares" defaultValue={stock.shares} />
          <button type="submit">Update</button>
        </form>
      );
    }
    ```

    **Optimistic Updates**

    **Pattern: Update UI Immediately, Rollback on Error**

    **For instant perceived performance:**

    ```typescript
    // components/StockList.tsx
    'use client';

    import { useOptimistic } from 'react';
    import { updateStock } from '@app/actions/stocks';

    export function StockList({ stocks }: { stocks: Stock[] }) {
      const [optimisticStocks, addOptimisticUpdate] = useOptimistic(
        stocks,
        (state, newStock: Stock) => {
          return state.map(s => s.id === newStock.id ? newStock : s);
        }
      );

      async function handleUpdate(stockId: string, shares: number) {
        // Optimistically update UI immediately
        const optimisticStock = {
          ...stocks.find(s => s.id === stockId)!,
          shares
        };
        addOptimisticUpdate(optimisticStock);

        try {
          // Perform actual mutation
          await updateStock({ stockId, shares });
          // Success - revalidatePath will update with real data
        } catch (error) {
          // Error - UI automatically rolls back to original state
          console.error('Update failed:', error);
        }
      }

      return (
        <div>
          {optimisticStocks.map(stock => (
            <StockCard
              key={stock.id}
              stock={stock}
              onUpdate={(shares) => handleUpdate(stock.id, shares)}
            />
          ))}
        </div>
      );
    }
    ```

    **Manual optimistic updates (without useOptimistic):**

    ```typescript
    export function StockCard({ stock }: Props) {
      const [localShares, setLocalShares] = useState(stock.shares);
      const [isSaving, setIsSaving] = useState(false);

      async function handleSave(newShares: number) {
        // Optimistic update
        const previousShares = localShares;
        setLocalShares(newShares);
        setIsSaving(true);

        try {
          await updateStock({ stockId: stock.id, shares: newShares });
          // Success
        } catch (error) {
          // Rollback on error
          setLocalShares(previousShares);
          alert('Update failed');
        } finally {
          setIsSaving(false);
        }
      }

      return (
        <div>
          <span>{localShares} shares</span>
          <button onClick={() => handleSave(localShares + 10)}>
            +10 {isSaving && '(saving...)'}
          </button>
        </div>
      );
    }
    ```


  **Why:** Enhanced security (no separate API endpoint to secure), reduced boilerplate, automatic revalidation and partial refresh capabilities, and improved performance.
- **Page Route Organization:** 
  - **Use Route Groups (`(group)`) to organize routes without affecting URL paths.**
  ```typescript
  // Directory structure
  app/
  ├── (marketing)/           # Route group (not in URL)
  │   ├── layout.tsx        # Marketing layout
  │   ├── page.tsx          # / (homepage)
  │   ├── about/
  │   │   └── page.tsx      # /about
  │   └── pricing/
  │       └── page.tsx      # /pricing
  │
  ├── (dashboard)/           # Different route group
  │   ├── layout.tsx        # Dashboard layout
  │   ├── portfolio/
  │   │   └── page.tsx      # /portfolio
  │   └── stocks/
  │       └── page.tsx      # /stocks
  ```

  - **Pattern: Nested Layouts**

    **Share UI across routes:**

  ```typescript
  // app/layout.tsx (Root layout)
  export default function RootLayout({ children }: Props) {
    return (
      <html>
        <body>
          <Header />
          {children}
          <Footer />
        </body>
      </html>
    );
  }

  // app/(dashboard)/layout.tsx (Nested layout)
  export default function DashboardLayout({ children }: Props) {
    return (
      <div className="dashboard">
        <Sidebar />
        <main>{children}</main>
      </div>
    );
  }

  // app/(dashboard)/portfolio/page.tsx
  // This page has both Root + Dashboard layouts
  export default function PortfolioPage() {
    return <PortfolioContent />;
  }
  ```
- **SEO:** 
  - **Export `metadata` from page components for improved SEO.**
  ```typescript
    // ✅ GOOD: Export metadata for SEO
    // app/portfolio/page.tsx
    import { Metadata } from 'next';

    export const metadata: Metadata = {
      title: 'Portfolio Tracker - Energy & Copper',
      description: 'Live portfolio tracking with risk metrics',
      openGraph: {
        title: 'Portfolio Tracker',
        description: 'Track your investments in real-time',
      }
    };

    // Or dynamic metadata
    export async function generateMetadata({ params }: Props): Promise<Metadata> {
      const portfolio = await getPortfolio(params.id);

      return {
        title: `${portfolio.name} - Portfolio Tracker`,
        description: `View ${portfolio.name} performance and holdings`
      };
    }
  ```
- **API Routes:**
  ### Pattern: RESTful API Endpoints

  **Standard CRUD operations:**

    ```typescript
    // app/api/stocks/route.ts
    import { NextRequest, NextResponse } from 'next/server';

    // GET /api/stocks
    export async function GET(request: NextRequest) {
      const searchParams = request.nextUrl.searchParams;
      const portfolioId = searchParams.get('portfolioId');

      const stocks = await prisma.stock.findMany({
        where: portfolioId ? { portfolioId } : undefined
      });

      return NextResponse.json(stocks);
    }

    // POST /api/stocks
    export async function POST(request: NextRequest) {
      const body = await request.json();

      // Validate
      const validated = StockSchema.parse(body);

      // Create
      const stock = await prisma.stock.create({
        data: validated
      });

      return NextResponse.json(stock, { status: 201 });
    }

    // app/api/stocks/[id]/route.ts
    // PUT /api/stocks/[id]
    export async function PUT(
      request: NextRequest,
      { params }: { params: { id: string } }
    ) {
      const body = await request.json();

      const stock = await prisma.stock.update({
        where: { id: params.id },
        data: body
      });

      return NextResponse.json(stock);
    }

    // DELETE /api/stocks/[id]
    export async function DELETE(
      request: NextRequest,
      { params }: { params: { id: string } }
    ) {
      await prisma.stock.delete({
        where: { id: params.id }
      });

      return NextResponse.json({ success: true });
    }
    ```

  **Standard response patterns:**

    ```typescript
    // Success
    return NextResponse.json({ data, success: true });

    // Error
    return NextResponse.json(
      { error: 'Message', code: 'ERROR_CODE' },
      { status: 400 }
    );

    // With headers
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=3600',
        'X-Custom-Header': 'value'
      }
    });
    ```

  **Always mark routes as dynamic and set runtime:**

    ```typescript
    // ✅ GOOD
    export const dynamic = 'force-dynamic';
    export const runtime = 'nodejs';

    export async function GET(request: NextRequest) {
      // ...
    }
    ```

  **Consistent error response structure:**
    ```typescript
    // ✅ GOOD
    return NextResponse.json(
      { error: 'Rate limit exceeded', code: 'RATE_LIMIT' },
      { status: 429 }
    );

    // ❌ BAD - inconsistent error formats
    return NextResponse.json('Error', { status: 500 });
    return new Response('Bad request');
    ```

  **Validate inputs at the API boundary:**
    ```typescript
    // ✅ GOOD
    const symbols = searchParams.get('symbols');
    if (!symbols) {
      return NextResponse.json(
        { error: 'Missing required parameter: symbols' },
        { status: 400 }
      );
    }

    // ❌ BAD - assuming parameters exist
    const symbols = searchParams.get('symbols');
    const list = symbols.split(','); // Could crash!
    ```

  **Log important operations for debugging:**

    ```typescript
    // ✅ GOOD
    console.log(`Fetching quotes for ${symbols.length} symbols`);
    console.log(`Rate limit active. Resets in ${hoursRemaining} hours`);

    // But avoid logging sensitive data
    console.log(`API key: ${apiKey}`); // ❌ NEVER
    ```
 



## Code Review Checklist

Before submitting code, verify:

**Architecture (CRITICAL):**
- [ ] ✅ Did you use Server Components for data fetching where possible?
- [ ] ✅ Are Client Components (`'use client'`) only used for interactivity?
- [ ] ✅ Is client-side data fetching (e.g., in `useEffect` or with SWR) used only when necessary for dynamic updates, not for initial page load?

**Code Quality:**
- [ ] All imports use `@/` path aliases (no `../../../`)
- [ ] TypeScript strict mode passes with no `any` types
- [ ] Error states are handled (try/catch, error boundaries)
- [ ] Loading states are displayed to users
- [ ] API routes have `dynamic = 'force-dynamic'` export
- [ ] Database queries check for null/undefined results
- [ ] External API calls respect rate limits and use caching
- [ ] React components have proper key props (not index)
- [ ] Environment variables are not hardcoded
- [ ] Sensitive data (API keys) never logged
- [ ] Prisma client used from `@lib/prisma` (not re-instantiated)
- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Console has no errors in browser dev tools

## Performance Guidelines

### 1. Minimize Re-renders

```typescript
// ✅ GOOD - Memoize expensive calculations
const metrics = useMemo(() =>
  calculatePortfolioMetrics(stocks, borrowedAmount),
  [stocks, borrowedAmount]
);

// ❌ BAD
const metrics = calculatePortfolioMetrics(stocks, borrowedAmount); // Recalculated every render
```

### 2. Batch API Calls

```typescript
// ✅ GOOD
const quotes = await fetchBatchQuotes(['CNQ', 'SU', 'TRMLF']);

// ❌ BAD
const cnq = await fetchQuote('CNQ');
const su = await fetchQuote('SU');
const trmlf = await fetchQuote('TRMLF');
```

### 3. Debounce User Input

```typescript
// ✅ GOOD
const debouncedSearch = useMemo(
  () => debounce((query: string) => performSearch(query), 300),
  []
);

// ❌ BAD
<input onChange={(e) => performSearch(e.target.value)} /> // Search on every keystroke
```

## Security Best Practices

### 1. Environment Variables

**Understand the difference between client and server variables:**

```typescript
// ✅ GOOD - Server-side only (API routes, Server Components)
// app/api/quote/route.ts
const apiKey = process.env.ALPHAVANTAGE_API_KEY; // Never exposed to client

// ✅ GOOD - Client-side accessible (intentional)
// app/page.tsx
const publicKey = process.env.NEXT_PUBLIC_STRIPE_KEY; // Exposed in bundle (OK for public keys)

// ❌ BAD - Exposing secrets
const apiKey = process.env.NEXT_PUBLIC_API_KEY; // DON'T prefix secrets with NEXT_PUBLIC_
```

**Environment variable rules:**
- `NEXT_PUBLIC_*` → Embedded in client bundle (use only for public data)
- Others → Server-side only (API keys, database URLs, secrets)
- Never commit `.env` files to git
- Use `.env.local` for local development
- Configure environment variables in Vercel dashboard for production

**Current project uses:**
```bash
# Server-only (correct)
ALPHAVANTAGE_API_KEY=...
FMP_API_KEY=...
NEWS_API_KEY=...
DATABASE_URL=...
GEMINI_API_KEY=...

# No NEXT_PUBLIC_ variables (correct - all keys are server-only)
```

### 2. Input Validation

**Always validate and sanitize user input:**

```typescript
// ✅ GOOD - Manual validation
const shares = parseInt(searchParams.get('shares') || '0', 10);
if (isNaN(shares) || shares <= 0 || shares > 1000000) {
  return NextResponse.json(
    { error: 'Invalid shares: must be 1-1000000' },
    { status: 400 }
  );
}

// ✅ BETTER - Use Zod for complex validation
import { z } from 'zod';

const UpdateStockSchema = z.object({
  shares: z.number().int().positive().max(1000000),
  symbol: z.string().min(1).max(10).regex(/^[A-Z]+$/),
  avgPrice: z.number().positive().max(1000000)
});

// In Server Action or API route
export async function updateStock(input: unknown) {
  const validated = UpdateStockSchema.parse(input); // Throws if invalid
  await prisma.stock.update({ where: { id }, data: validated });
}

// ❌ BAD - No validation
const shares = searchParams.get('shares');
await prisma.stock.update({ data: { shares } }); // SQL injection risk
```

### 3. Authentication and Authorization

**For Server Actions and API routes:**

```typescript
// ✅ GOOD - Check auth in Server Actions
'use server';

import { auth } from '@lib/auth';
import { revalidatePath } from 'next/cache';

export async function updatePortfolio(portfolioId: string, data: any) {
  const session = await auth();

  // Authentication check
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  // Authorization check
  const portfolio = await prisma.portfolio.findUnique({
    where: { id: portfolioId }
  });

  if (portfolio.userId !== session.user.id) {
    throw new Error('Forbidden - not your portfolio');
  }

  // Proceed with update
  await prisma.portfolio.update({ where: { id: portfolioId }, data });
  revalidatePath('/portfolio');
}

// ✅ GOOD - Proxy for route protection
// proxy.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const token = request.cookies.get('session');

  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/portfolio/:path*']
};
```

**Current project note:** This is a personal portfolio tracker without authentication. If adding multi-user support, implement the patterns above.

### 4. Sanitize External Data

**Always sanitize before rendering HTML:**

```typescript
// ✅ GOOD - Sanitize external content
import DOMPurify from 'dompurify';

function NewsArticle({ article }: Props) {
  const cleanContent = DOMPurify.sanitize(article.content, {
    ALLOWED_TAGS: ['p', 'strong', 'em', 'a'],
    ALLOWED_ATTR: ['href']
  });

  return <div dangerouslySetInnerHTML={{ __html: cleanContent }} />;
}

// ❌ BAD - Raw HTML injection (XSS vulnerability)
function BadNewsArticle({ article }: Props) {
  return <div dangerouslySetInnerHTML={{ __html: article.content }} />;
}

// ✅ BEST - Use React's built-in escaping
function SafeNewsArticle({ article }: Props) {
  return <div>{article.content}</div>; // Automatically escaped
}
```

### 5. Rate Limiting

**Implement rate limiting for public endpoints:**

```typescript
// ✅ GOOD - API route with rate limiting
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 requests per 10 seconds
});

export async function POST(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1';
  const { success, limit, remaining } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString()
        }
      }
    );
  }

  // Process request
}
```

**Current project uses in-memory rate limiting:**

See `lib/rateLimitTracker.ts` and `app/api/quote/route.ts:14-42` for Alpha Vantage rate limit tracking.

### 6. Content Security Policy (CSP)

**Configure CSP headers in `next.config.js`:**

```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.alphavantage.co https://api.polygon.io",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

### 7. SQL Injection Prevention

**Prisma protects against SQL injection automatically:**

```typescript
// ✅ GOOD - Prisma parameterizes queries
const stock = await prisma.stock.findUnique({
  where: { symbol: userInput } // Safe - parameterized
});

// ❌ BAD - Raw SQL with string concatenation (DON'T DO THIS)
await prisma.$executeRaw`SELECT * FROM stocks WHERE symbol = ${userInput}`; // Vulnerable!

// ✅ GOOD - Use Prisma.sql for raw queries
import { Prisma } from '@prisma/client';
await prisma.$executeRaw(
  Prisma.sql`SELECT * FROM stocks WHERE symbol = ${userInput}` // Safe - parameterized
);
```

### 8. Secure Session Management

**If adding authentication:**

```typescript
// ✅ GOOD - Secure cookie configuration
import { cookies } from 'next/headers';

export async function setSession(userId: string) {
  cookies().set('session', token, {
    httpOnly: true,     // Not accessible via JavaScript
    secure: true,       // HTTPS only
    sameSite: 'lax',    // CSRF protection
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: '/'
  });
}

// ❌ BAD - Insecure cookie
cookies().set('session', token, {
  httpOnly: false,  // JavaScript can access
  secure: false     // Works over HTTP (insecure)
});
```

## Performance Optimization

### 1. Reduce Client Bundle Size

**Use Server Components to minimize JavaScript:**

Server Components run on the server and do not contribute to the client-side JavaScript bundle. This is the primary way to improve initial page load performance.

```typescript
// ✅ GOOD - Server Component (no JS sent to client)
// app/reports/page.tsx
async function ReportsPage() {
  const data = await fetchReportData();
  return <StaticReport data={data} />; // Renders to pure HTML/RSC payload
}

// ❌ BAD - Fetching and rendering everything on the client
'use client';
export default function PortfolioPage() {
  const { data } = useSWR('/api/report', fetcher);
  // This entire component and its dependencies are sent to the client.
  // This is only necessary for highly interactive data that needs constant updates.
}
```

**Analyze bundle size:**

```bash
npm run build
# Check output for bundle sizes
# Large client-side bundles (>200KB) should be investigated.
# Move components to the server where possible.
```

### 2. Streaming with Suspense

**Load components progressively:**

```typescript
// ✅ GOOD - Stream slow components
import { Suspense } from 'react';

export default function DashboardPage() {
  return (
    <div>
      <PortfolioHeader />

      <Suspense fallback={<StocksSkeleton />}>
        <SlowStocksData />
      </Suspense>

      <Suspense fallback={<NewsSkeleton />}>
        <SlowNewsData />
      </Suspense>
    </div>
  );
}

async function SlowStocksData() {
  const stocks = await fetchStocksWithDelay(); // Slow operation
  return <StocksList stocks={stocks} />;
}
```

### 3. Image Optimization

**Always use `next/image` component:**

```typescript
// ✅ GOOD - Optimized images
import Image from 'next/image';

function CompanyLogo({ symbol }: Props) {
  return (
    <Image
      src={`/logos/${symbol}.png`}
      alt={`${symbol} logo`}
      width={50}
      height={50}
      loading="lazy"
      quality={85}
    />
  );
}

// ❌ BAD - Regular img tag (no optimization)
function BadLogo({ symbol }: Props) {
  return <img src={`/logos/${symbol}.png`} alt={symbol} />;
}
```

### 4. Code Splitting with Dynamic Imports

**Lazy load heavy components:**

```typescript
// ✅ GOOD - Lazy load charting library
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false // Don't render on server (if chart needs browser APIs)
});

export default function AnalyticsPage() {
  return (
    <div>
      <Header />
      <HeavyChart data={data} /> {/* Only loaded when needed */}
    </div>
  );
}

// ❌ BAD - Import everything upfront
import HeavyChart from '@/components/HeavyChart'; // Loaded immediately
```

### 5. Caching Strategies

**Implement proper caching at multiple layers:**

```typescript
// ✅ GOOD - Multi-layer caching
// 1. HTTP Cache (fetch API)
const res = await fetch(url, {
  next: { revalidate: 3600 } // Cache for 1 hour
});

// 2. React Cache (request deduplication)
import { cache } from 'react';
const getPortfolio = cache(async (id: string) => {
  return await prisma.portfolio.findUnique({ where: { id } });
});

// 3. Client-side cache (current project)
const cached = loadFromCache('quotes');
if (cached && getCacheAge('quotes') < 300000) return cached;
```

### 6. Database Query Optimization

**Optimize Prisma queries:**

```typescript
// ✅ GOOD - Only fetch needed fields
const stocks = await prisma.stock.findMany({
  where: { portfolioId },
  select: {
    id: true,
    symbol: true,
    shares: true,
    currentPrice: true
    // Don't fetch unnecessary fields
  }
});

// ❌ BAD - Fetching everything
const stocks = await prisma.stock.findMany({
  where: { portfolioId },
  include: {
    portfolio: {
      include: {
        theses: true,
        checklists: {
          include: { tasks: true }
        }
      }
    }
  }
}); // Massive overfetching

// ✅ GOOD - Use indexes for frequent queries
// In schema.prisma
model Stock {
  portfolioId String
  symbol      String

  @@index([portfolioId])  // Index for WHERE portfolioId
  @@index([symbol])       // Index for WHERE symbol
}
```

### 7. Monitoring Core Web Vitals

**Track performance metrics:**

```typescript
// app/layout.tsx or _app.tsx
export function reportWebVitals(metric: any) {
  console.log(metric);

  // Send to analytics
  if (metric.label === 'web-vital') {
    // Track LCP, FID, CLS, etc.
    analytics.track('Web Vital', {
      name: metric.name,
      value: metric.value,
      id: metric.id
    });
  }
}
```

**Target metrics:**
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1
- **TTFB** (Time to First Byte): < 800ms

## Testing Approach

### Test File Organization

Follow Jest's standard convention for organizing test files. Place test files in a `__tests__` directory under the code being tested. This ensures a clear association between the test files and the code they validate.

**Example:**
```
api/
├── auth/
│   ├── index.ts
│   └── __tests__/
│       └── auth.test.ts
```
**Why:** This structure improves test discoverability and aligns with widely accepted best practices.

### 1. Unit Tests (Jest)

**Test business logic and utilities:**

```typescript
// tests/calculator.test.ts
import { calculateSharpeRatio, calculateSortinoRatio } from '@lib/calculator';

describe('Risk Metrics', () => {
  describe('calculateSharpeRatio', () => {
    it('should calculate Sharpe ratio correctly', () => {
      const returns = [0.05, 0.03, -0.02, 0.07, 0.04];
      const riskFreeRate = 0.02;

      const sharpe = calculateSharpeRatio(returns, riskFreeRate);

      expect(sharpe).toBeCloseTo(0.735, 2);
    });

    it('should return null for insufficient data', () => {
      expect(calculateSharpeRatio([], 0.02)).toBeNull();
    });

    it('should return null when stdDev is zero', () => {
      const returns = [0.02, 0.02, 0.02];
      expect(calculateSharpeRatio(returns, 0.02)).toBeNull();
    });
  });
});
```

**Run tests:**

```bash
npm test                           # All tests
npx jest calculator.test.ts        # Single file
npx jest --watch                   # Watch mode
npx jest --coverage                # Coverage report
```

### 2. Component Tests (React Testing Library)

**Test React components:**

```typescript
// tests/components/PortfolioHeader.test.tsx
import { render, screen } from '@testing-library/react';
import PortfolioHeader from '@/components/PortfolioHeader';

describe('PortfolioHeader', () => {
  const mockPortfolio = {
    totalValue: 25000,
    totalGain: 5000,
    totalGainPercent: 25
  };

  it('renders portfolio value', () => {
    render(
      <PortfolioHeader
        portfolio={mockPortfolio}
        config={mockConfig}
        alerts={null}
      />
    );

    expect(screen.getByText('$25,000.00')).toBeInTheDocument();
    expect(screen.getByText('+25.00%')).toBeInTheDocument();
  });

  it('shows alert banner when stop-loss triggered', () => {
    render(
      <PortfolioHeader
        portfolio={mockPortfolio}
        config={mockConfig}
        alerts={{ stopLoss: true }}
      />
    );

    expect(screen.getByText(/stop-loss/i)).toBeInTheDocument();
  });
});
```

### 3. E2E Tests (Playwright)

**Test user flows:**

```typescript
// tests/e2e/portfolio.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Portfolio Tracker', () => {
  test('should display energy portfolio', async ({ page }) => {
    await page.goto('/');

    // Check portfolio loaded
    await expect(page.locator('h1')).toContainText('Energy Portfolio');

    // Check stocks are visible
    await expect(page.locator('[data-testid="stock-CNQ"]')).toBeVisible();
    await expect(page.locator('[data-testid="stock-SU"]')).toBeVisible();

    // Check price updates
    const price = await page.locator('[data-testid="stock-CNQ-price"]').textContent();
    expect(price).toMatch(/\$\d+\.\d{2}/);
  });

  test('should switch between portfolios', async ({ page }) => {
    await page.goto('/');

    await page.click('text=Copper');
    await expect(page.locator('h1')).toContainText('Copper Portfolio');

    await expect(page.locator('[data-testid="stock-FCX"]')).toBeVisible();
  });

  test('should sort stocks by symbol', async ({ page }) => {
    await page.goto('/');

    await page.click('text=Symbol');

    const symbols = await page.locator('[data-testid^="stock-"]').allTextContents();
    const sorted = [...symbols].sort();
    expect(symbols).toEqual(sorted);
  });
});
```

**Run E2E tests:**

```bash
npx playwright test              # Run all E2E tests
npx playwright test --ui         # Interactive mode
npx playwright test --debug      # Debug mode
```

### 4. Testing Server Components

**Test data fetching logic separately:**

```typescript
// tests/pages/portfolio.test.ts
import { getPortfolioData } from '@app/portfolio/data';

describe('Portfolio Page Data', () => {
  it('should fetch portfolio with stocks', async () => {
    const data = await getPortfolioData('energy');

    expect(data.portfolio).toBeDefined();
    expect(data.portfolio.type).toBe('energy');
    expect(data.stocks.length).toBeGreaterThan(0);
  });

  it('should handle missing portfolio', async () => {
    await expect(
      getPortfolioData('nonexistent')
    ).rejects.toThrow('Portfolio not found');
  });
});
```

### 5. Testing Server Actions

**Mock and test validation:**

```typescript
// tests/actions/updateStock.test.ts
import { updateStock } from '@app/actions/stocks';
import { prisma } from '@lib/prisma';

jest.mock('@lib/prisma', () => ({
  prisma: {
    stock: {
      update: jest.fn()
    }
  }
}));

describe('updateStock Server Action', () => {
  it('should update stock with valid input', async () => {
    const input = {
      stockId: 'stock-123',
      shares: 100,
      avgPrice: 50.00
    };

    await updateStock(input);

    expect(prisma.stock.update).toHaveBeenCalledWith({
      where: { id: 'stock-123' },
      data: { shares: 100, avgPrice: 50.00 }
    });
  });

  it('should reject invalid input', async () => {
    const input = {
      stockId: 'stock-123',
      shares: -100, // Invalid
      avgPrice: 50.00
    };

    await expect(updateStock(input)).rejects.toThrow('Invalid shares');
  });
});
```

### Current Project Testing

**Existing tests:** Located in `tests/` directory

```bash
npm test                                    # Run all Jest tests
npx tsx scripts/test-e2e.ts                # Integration test
npx tsx scripts/test-models.ts             # Database model tests
```

## Deployment Checklist

Before deploying to production:

### Environment & Configuration
- [ ] All environment variables configured in Vercel dashboard
- [ ] `DATABASE_URL` points to production database
- [ ] API keys are valid and have appropriate rate limits
- [ ] `NEXT_PUBLIC_*` variables only contain non-sensitive data

### Database
- [ ] Database migrations run: `npx prisma db push`
- [ ] Prisma client generated: `npx prisma generate`
- [ ] Database seeded if needed: `npx tsx scripts/seed-db.ts`
- [ ] Database indexes created for frequently queried fields
- [ ] Database connection pooling configured

### Build & Tests
- [ ] Local build succeeds: `npm run build`
- [ ] No TypeScript errors
- [ ] All tests pass: `npm test`
- [ ] No console errors in production build
- [ ] Bundle size is reasonable (check build output)

### Security
- [ ] Security headers configured (CSP, X-Frame-Options, etc.)
- [ ] Environment variables not exposed to client
- [ ] Input validation implemented for all user inputs
- [ ] Rate limiting configured for API routes
- [ ] Authentication/authorization implemented if needed
- [ ] HTTPS enforced

### Monitoring & Observability
- [ ] Error tracking setup (Sentry, LogRocket, etc.)
- [ ] Analytics configured (Google Analytics, Vercel Analytics, etc.)
- [ ] Performance monitoring active (Vercel Speed Insights, etc.)
- [ ] Logging configured for API routes
- [ ] Uptime monitoring setup (UptimeRobot, Pingdom, etc.)

### SEO & Metadata
- [ ] Page titles and descriptions set
- [ ] Open Graph tags configured
- [ ] Favicon and app icons added
- [ ] robots.txt configured
- [ ] sitemap.xml generated (if needed)

### Performance
- [ ] Images optimized with `next/image`
- [ ] Caching strategies implemented
- [ ] Core Web Vitals meet targets (LCP < 2.5s, FID < 100ms, CLS < 0.1)
- [ ] Lighthouse score > 90
- [ ] No unused dependencies

### Vercel Specific
- [ ] Project connected to GitHub repository
- [ ] Automatic deployments enabled
- [ ] Preview deployments configured for PRs
- [ ] Production domain configured
- [ ] Edge Functions enabled if needed
- [ ] Vercel Postgres connection configured

### Post-Deployment
- [ ] Smoke test production deployment
- [ ] Check API routes return expected data
- [ ] Verify database connections work
- [ ] Test authentication flows (if applicable)
- [ ] Monitor error rates for first 24 hours
- [ ] Set up alerts for critical errors

## Documentation Standards

### Function Documentation

```typescript
/**
 * Calculate Sharpe Ratio for portfolio performance
 *
 * @param portfolioReturns - Array of historical portfolio returns
 * @param riskFreeRate - Annual risk-free rate (e.g., 0.045 for 4.5%)
 * @returns Sharpe ratio or null if calculation not possible
 */
export function calculateSharpeRatio(
  portfolioReturns: number[],
  riskFreeRate: number
): number | null {
  // Implementation
}
```

### Component Documentation

```typescript
/**
 * Displays portfolio header with total value, P&L, and alerts
 *
 * @param portfolio - Current portfolio data
 * @param config - Portfolio configuration from lib/config.ts
 * @param alerts - Alert state (stop-loss/take-profit)
 */
export default function PortfolioHeader({
  portfolio,
  config,
  alerts
}: Props) {
  // Implementation
}
```

## Common Gotchas

1. **Rate limits:** Alpha Vantage has 25 req/day limit. Check `rateLimitResetTime` in `/api/quote/route.ts:14-42`
2. **OTC stocks:** TRMLF and AETUF only work with Alpha Vantage, not FMP
3. **Prisma client:** Run `npx prisma generate` after schema changes
4. **Database URL:** Must be PostgreSQL (Vercel Postgres or local)
5. **AI caching:** 15min TTL, check cache hits in logs
6. **TypeScript paths:** Always use `@/` imports, never relative `../` for cross-directory imports
7. **Null vs undefined:** Prisma returns `null` for missing values, not `undefined`
8. **Module system:** Package type is "module" (ESM), not CommonJS
9. **Vercel limitations:** Cold starts can delay API routes (consider caching)
10. **Time zones:** Market data timestamps may be in different time zones (ET, UTC)

## Debugging Tips

### Next.js Debugging

#### 1. React Developer Tools - Identify Component Type

**Check if a component is Server or Client:**

```bash
# Install React DevTools browser extension
# Chrome: https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi
# Firefox: https://addons.mozilla.org/en-US/firefox/addon/react-devtools/
```

In DevTools:
- **Server Components**: Appear with special badges/indicators
- **Client Components**: Show 'use client' in component tree
- **Hover over components** to see Server/Client designation

In DevTools, you can inspect the component tree to see which components are running on the server versus the client. This is crucial for debugging.

#### 2. Console Logging - Server vs Client

**Server Components (API routes, Server Components):**

```typescript
// app/api/quote/route.ts
export async function GET(request: NextRequest) {
  console.log('Server log - appears in TERMINAL'); // ← Terminal output
  console.log('Request params:', Object.fromEntries(searchParams.entries()));

  const data = await fetchData();
  console.log('Response data:', JSON.stringify(data, null, 2));

  return NextResponse.json(data);
}
```

**Client Components:**

```typescript
// components/PortfolioHeader.tsx
'use client';

export default function PortfolioHeader() {
  console.log('Client log - appears in BROWSER CONSOLE'); // ← Browser console

  useEffect(() => {
    console.log('Effect running:', portfolio);
  }, [portfolio]);

  return <div>...</div>;
}
```

**Key distinction:**
- **Server logs** → Terminal/command line (where `npm run dev` is running)
- **Client logs** → Browser DevTools Console (F12)

#### 3. Network Tab - RSC Payloads

**Inspect React Server Component payloads:**

1. Open Browser DevTools (F12) → **Network tab**
2. Filter by **Fetch/XHR**
3. Look for requests to your routes
4. Check **Response** tab for RSC payload format

**What to look for:**

```bash
# Server Component response format
# Look for special React Server Component markers:
# - Streaming chunks (if using Suspense)
# - Serialized component data
# - Server-rendered HTML

# Example RSC payload indicators:
# - Content-Type: text/x-component
# - Special React markers in response
```

Since this project uses Server Components, you will see RSC payloads in the Network tab. These are different from standard JSON API responses and contain the rendered UI from the server.

#### 4. Cache Headers - Verify Caching

**Check Next.js cache headers in Network tab:**

```bash
# In browser DevTools → Network → Select request → Headers tab
# Look for:

x-nextjs-cache: HIT          # Response from cache
x-nextjs-cache: MISS         # Fresh response, now cached
x-nextjs-cache: STALE        # Stale data, revalidating
x-nextjs-cache: BYPASS       # Cache bypassed
```

**Verify your caching strategy:**

```typescript
// Check if fetch caching is working
const res = await fetch(url, {
  next: { revalidate: 3600 }
});

// In Network tab, subsequent requests should show:
// x-nextjs-cache: HIT
```

**Current project uses custom localStorage caching:**

```typescript
// Check cache age in browser console
getCacheAge('quotes-energy'); // Returns milliseconds since cached
```

#### 5. Debug Caching Issues

**Temporarily disable caching to isolate issues:**

```typescript
// ✅ Disable fetch cache for debugging
const res = await fetch(url, {
  cache: 'no-store'  // Forces fresh request every time
});

// ✅ Disable Next.js cache
const res = await fetch(url, {
  next: { revalidate: 0 }  // No caching
});

// ✅ Disable custom localStorage cache (current project)
// In browser console:
localStorage.clear();  // Clear all cache
localStorage.removeItem('quotes-energy');  // Clear specific key
```

**Force revalidation:**

```typescript
// In Server Actions or API routes
import { revalidatePath, revalidateTag } from 'next/cache';

revalidatePath('/portfolio');        // Revalidate specific path
revalidateTag('quotes');              // Revalidate by tag
```

**Current project debugging:**

```typescript
// Bypass Next.js fetch cache in Server Components
// app/portfolio/page.tsx
const fetchData = async () => {
  const fresh = await fetch('/api/quote?symbols=CNQ,SU', {
    cache: 'no-store' // Disable caching for this request
  });
  return fresh;
};
```

#### 6. Source Maps & Error Tracking

**Enable source maps for better error messages:**

```javascript
// next.config.js
module.exports = {
  productionBrowserSourceMaps: true,  // Enable in production (larger bundle)
};
```

**Check error boundaries:**

```typescript
// app/error.tsx (must be Client Component)
'use client';

export default function Error({ error, reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error('Error boundary caught:', error);

  return (
    <div>
      <h2>Something went wrong!</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

#### 7. Hot Reload Issues

**If hot reload stops working:**

```bash
# Clear Next.js cache
rm -rf .next

# Restart dev server
npm run dev

# Or on Windows:
rmdir /s /q .next
npm run dev
```

**Check file watchers (Linux/macOS):**

```bash
# Increase file watcher limit
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### Enable Debug Logging

```typescript
// Add to API routes for detailed logging
console.log('Request params:', Object.fromEntries(searchParams.entries()));
console.log('Response data:', JSON.stringify(data, null, 2));

// Enable Next.js debug mode
// Set in .env.local:
// NEXT_PUBLIC_DEBUG=true

// Check environment
console.log('Environment:', process.env.NODE_ENV);
console.log('API Provider:', process.env.STOCK_API_PROVIDER);
```

### Check Cache State

```typescript
// In browser console
Object.keys(localStorage).filter(k => k.includes('cache'));
localStorage.getItem('quotes-energy');

// Check cache age
const cacheAge = getCacheAge('quotes-energy');
console.log(`Cache age: ${cacheAge}ms (${(cacheAge / 1000 / 60).toFixed(1)} minutes)`);

// Check if cache is stale
const isStale = cacheAge > 5 * 60 * 1000; // > 5 minutes
console.log(`Cache is ${isStale ? 'STALE' : 'FRESH'}`);
```

### Inspect Database

```bash
npx prisma studio  # Open GUI
npx tsx scripts/check-db.ts  # Run diagnostic script

# Check database connection
npx prisma db pull  # Pull schema from database

# View raw SQL queries (add to prisma client)
# lib/prisma.ts
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],  // Enable query logging
});
```

### Monitor Rate Limits

Check API route logs for rate limit messages:
```
Rate limit active. Resets in 3.2 hours
Rate limit marked. Resets at 2025-11-20T00:00:00.000Z
```

**Track API usage:**

```typescript
// In API route
console.log(`API calls today: ${callCount}/25`);
console.log(`Time until reset: ${resetTime - Date.now()}ms`);
```

### Performance Profiling

**React Profiler:**

```typescript
// Wrap components to measure render performance
import { Profiler } from 'react';

function onRenderCallback(
  id: string,
  phase: 'mount' | 'update',
  actualDuration: number
) {
  console.log(`${id} (${phase}) took ${actualDuration}ms`);
}

export default function App() {
  return (
    <Profiler id="PortfolioPage" onRender={onRenderCallback}>
      <PortfolioPage />
    </Profiler>
  );
}
```

**Next.js Build Analysis:**

```bash
# Analyze bundle size
npm run build

# Look for large bundles (>200KB)
# Check output:
# ┌ ○ Static  automatically generated as static HTML + JSON
# ├ ● SSG     automatically generated as static HTML + JSON
# └ λ Server  server-side renders at runtime
```

### Browser DevTools Tips

**Performance tab:**
1. Click **Record**
2. Perform action (e.g., switch portfolios)
3. Stop recording
4. Analyze:
   - **Scripting** time (JavaScript execution)
   - **Rendering** time (layout, paint)
   - **Long tasks** (>50ms)


---

## Quota Enforcement & Usage Tracking

**Reference:** See [Quota Enforcement Patterns](./QUOTA_ENFORCEMENT_PATTERNS.md) for detailed patterns

### Core Pattern

All quota-enforced features MUST use the **Check-Then-Track** pattern:

```typescript
// 1. Check quota (read-only)
const quotaCheck = await checkQuota(userId, action, tier);
if (!quotaCheck.allowed) throw new QuotaExceededError();

// 2. Execute operation
const response = await expensiveOperation();

// 3. Track ONLY if successful (with error handling)
if (response.status >= 200 && response.status < 300) {
  try {
    await trackUsage(userId, action, tier);
  } catch (error) {
    console.error('[Handler] Tracking failed:', error);
  }
}
```

### Key Rules

1. **Never track before operation completes** - Users should not be charged for failures
2. **Always wrap trackUsage in try-catch** - Tracking failures must not crash requests
3. **Use status code ranges** - Check `200-299` not just `response.ok`
4. **Protect external calls** - Wrap repository/API calls in try-catch
5. **Test concurrent scenarios** - Verify race condition prevention

### Testing Requirements

Every quota-enforced feature must test:
- ✅ Usage NOT tracked on failure
- ✅ Proper call order (check → execute → track)
- ✅ Request succeeds when tracking fails
- ✅ Concurrent requests respect limits

**See:** [QUOTA_ENFORCEMENT_PATTERNS.md](./QUOTA_ENFORCEMENT_PATTERNS.md) for complete guidelines

