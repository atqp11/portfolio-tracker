
# Next.js 16+ Coding Agent & Developer Guide

A consolidated, production-ready guide combining architecture, coding rules, RSC best practices, backend integration, auth patterns, and your custom `/src/backend/modules/*` MVC layout.

---

## 1. High-Level Principles

* **RSC-first**: All pages and layouts are Server Components by default.
* **Minimum JS**: Only add Client Components for interactivity (sorting, toggles, modals, buttons).
* **No business logic in pages**: Pages call backend services or controllers only.
* **Backend organized under**: `src/backend/modules/<module>/{controller,service,dto,zod}`.
* **DTO in/out everywhere** to enforce consistent shapes.
* **Zod validates API boundaries** (incoming payloads at API routes or server actions).
* **Caching uses RSC + fetch cache** unless dynamic.

---

## 2. Project Structure (Your Layout)

```
src/
  app/
    (routes...)
    api/
      ... route handlers
  backend/
    modules/
      user/
        dto/
        zod/
        controller/
        service/
      auth/
        session.ts
        middleware.ts
        wrappers.ts (withAuth, withErrorHandler)
```

**Where code lives**:

* **Zod** → Validate request payloads.
* **DTOs** → Define data shapes for UI & controllers.
* **Mappers** → Convert DB ↔ DTO shapes.
* **Repository** → Database queries (Prisma/Supabase).
* **Service** → Business logic.
* **Controller** → Orchestrate service + validation.
* **API/Server Actions** → Entry points that call controllers.

---

## 3. Layer Responsibilities (Strict)

### RSC Pages (`app/`)

**MUST:**
- Call controller methods, NOT services or repositories directly
- Be server components unless interactivity required
- Use `authGuard()` for protected pages
- Fetch via server actions or API routes

**MUST NOT:**
- Contain business logic or mapping
- Import services or repositories directly
- Query database directly

### Controllers (`src/backend/modules/*/controllers`)

**MUST:**
- Validate input using Zod schemas from `/zod`
- Call service layer
- Return DTOs defined in `/dto`

**MUST NOT:**
- Directly query DB
- Implement business logic
- Perform DTO/DB mapping (services do this)

### Services (`src/backend/modules/*/services`)

**MUST:**
- Implement domain/business logic
- Call repositories for data access
- Use mappers for DB → DTO conversion
- Return DTOs to controllers

**MUST NOT:**
- Contain Zod validation (controllers do this)
- Return raw DB rows to controllers
- Query database directly (use repositories)

### Repositories (`src/backend/modules/*/repositories`)

**MUST:**
- Query DB (Prisma/Supabase/etc)
- Return raw DB models

**MUST NOT:**
- Apply DTO conversion (services/mappers do this)
- Use Zod validation
- Contain business logic

### DTOs (`src/backend/modules/*/dto`)

**Purpose:**
- Define data shape for UI & controllers
- Represent stable boundaries between backend ⇆ frontend

**MUST:**
- Use Zod for runtime validation
- Be separate from DB models

### Zod Schemas (`src/backend/modules/*/zod`)

**Purpose:**
- Input params validation (search, route params, body)
- Output DTO validation

**MUST NOT:**
- Include DB types directly

### Mappers (`src/backend/modules/*/mappers`)

**MUST:**
- Convert DB → DTO
- Convert DTO → DB (for mutations)
- Be pure functions with no side effects
- Be used by services only

### Server Actions (`app/*/actions.ts`)

**MUST:**
- Call controllers (NOT services or repositories directly)
- Use `authGuard()` before sensitive operations
- Use `revalidatePath()` after mutations
- **Use `safeParse()` for validation, NOT `parse()`**
- Throw errors after validation failures (caught by `error.tsx`)
- Include `formatValidationError()` helper for user-friendly error messages

**MUST NOT:**
- Call DB or services directly
- Use Zod's `.parse()` method (throws uncaught errors)

**Validation Pattern (Required):**

```typescript
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { authGuard } from '@/backend/modules/auth/guards';
import { someController } from '@/backend/modules/some-module/controller';

// Define schemas at top of file
const inputSchema = z.object({
  field: z.string().min(1, 'Field is required'),
});

/**
 * Helper to format Zod validation errors into user-friendly messages
 */
function formatValidationError(error: z.ZodError): string {
  if (error.issues && error.issues.length > 0) {
    const firstError = error.issues[0];
    const field = firstError.path.length > 0 ? firstError.path.join('.') : '';
    return field ? `${field}: ${firstError.message}` : firstError.message;
  }
  return 'Validation failed';
}

export async function myAction(userId: string, data: unknown) {
  try {
    // 1. Auth check
    const session = await authGuard();
    if (!session.somePermission) {
      throw new Error('Unauthorized');
    }

    // 2. Validate with safeParse (NOT parse)
    const result = inputSchema.safeParse(data);
    if (!result.success) {
      throw new Error(formatValidationError(result.error));
    }

    // 3. Call controller
    await someController.doSomething(result.data, session.userId);

    // 4. Revalidate paths
    revalidatePath('/some/path');

    return { success: true };
  } catch (error) {
    // Re-throw with user-friendly message
    throw new Error(error instanceof Error ? error.message : 'Action failed');
  }
}
```

**Error Handling with error.tsx:**

Every route folder with Server Actions **MUST have**:
- `loading.tsx` - Loading UI during async operations
- `error.tsx` - Error boundary to catch thrown errors

```
app/(protected)/feature/
├── page.tsx         # RSC page
├── actions.ts       # Server actions
├── loading.tsx      # REQUIRED
└── error.tsx        # REQUIRED
```

**Why this pattern:**
- `safeParse()` returns `{ success, data?, error? }` - allows controlled error handling
- `parse()` throws `ZodError` immediately - bypasses try-catch, breaks error boundaries
- Throwing errors lets Next.js `error.tsx` boundaries display user-friendly UI
- `formatValidationError()` provides clear, actionable error messages

---

## 4. DB ↔ DTO Conversion Location

* Happens **inside mappers, called by services**.
* Controller receives raw params → validates with Zod → calls service.
* Service calls repository → uses mapper to convert DB → DTO → returns DTO to controller.

**Flow:**
```
RSC Page → Server Action/API → Controller (validates) → Service (business logic) 
  → Repository (queries DB) → Service (maps DB → DTO) → Controller → Response
```

Reason:

* Keeps controllers thin (validation only).
* Keeps services focused (business logic only).
* Centralizes conversion in mappers.
* Makes layers independently testable.

---

## 5. Auth Architecture (Updated)

### Authentication (AuthN) = Am I logged in?

* Enforced in **middleware.ts** for route protection (`/app` routes).
* Applied to routes by `config.matcher`.

### Authorization (AuthZ) = Should I access this resource?

* Done in **RSC pages using `authGuard()`** or **backend using `authGuard()`**.
* Example: admin checks, user-specific data access.

**Backend usage:**
```ts
const session = await authGuard();
controller({ userId: session.userId, ...params });
```

### Why?

* middleware cannot safely perform DB-heavy role checks.
* RSC and backend can safely decode full session and enforce permissions.

---

## 6. Protecting Pages (RSC)

### Step 1: middleware enforces authentication

```ts
// middleware.ts
import { getSessionFromRequest } from "@/backend/modules/auth/session";

export async function middleware(req) {
  const session = await getSessionFromRequest(req);
  if (!session) return Response.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
```

### Step 2: RSC page enforces authorization

```tsx
// app/admin/page.tsx
import { authGuard } from "@/backend/modules/auth/guards";

export default async function AdminPage() {
  const session = await authGuard();
  if (session.role !== "admin") return <div>Access denied</div>;
  return <AdminView user={session.user} />;
}
```

---

## 7. Using `withAuth` and `withErrorHandler` (Backend Only)

**Do NOT wrap RSC pages**.
RSC pages are compiled and cannot be runtime-wrapped. Use `authGuard()` instead.

### Always wrap:

* Server actions
* API route handlers
* Controller entry functions (if externally facing)

**Never wrap:**
* Services (no auth logic)
* Repositories (no auth logic)
* Mappers (pure functions)

Example:

```ts
export const updateUser = withErrorHandler(
  withAuth(async ({ user }, dto) => {
    return await userController.update(user.id, dto);
  })
);
```

### Example for route handlers

```ts
export const POST = withErrorHandler(
  withAuth(async ({ user }, req) => {
    const dto = await req.json();
    return await userController.update(user.id, dto);
  })
);
```

---

## 8. When to Use RSC Auth vs Backend Wrappers

### ✔ Use `authGuard()` in RSC pages

* Pages that must display role-gated UI (admin-only pages)
* Pages that must show different UI based on user
* Any route matched by middleware
* To get session data for UI rendering

### ✔ Use backend wrappers (`withAuth`)

* Server actions making secure mutations
* Route handlers in `/app/api/*`
* Controller entry functions (if externally facing)

**Never use `withAuth` in:**
* Services
* Repositories
* Mappers

### ⚠️ Rule of Thumb

> **RSC uses `authGuard()` for UI-level permissions.
> Backend uses `withAuth` wrappers for API/action-level permissions.
> Services/repos/mappers never touch auth.**

---

## 9. Error Pages and Loading Pages

**Every route folder MUST contain:**

* `loading.tsx` → Streaming skeleton for slow operations
* `error.tsx` → Renders on thrown error (server or client)

### Example

```
app/dashboard/loading.tsx
app/dashboard/error.tsx
```

Keep them RSC by default.

---

## 10. Caching Best Practices

### RSC Page-Level Caching

RSC pages control caching via:

```ts
export const revalidate = 3600; // seconds
```

### Backend Caching

* Use RSC `fetch()` with built-in caching.
* For dynamic content: `fetch(url, { cache: "no-store" })`.
* Backend functions may use `cache()` ONLY if deterministic + user-independent.
* Service layer may implement Redis/Upstash for cross-route caching.

### Mutations

**Mutations MUST call:**

```ts
revalidatePath('/dashboard');
revalidateTag('portfolio');
```

---

## 11. Example Folder Structure (Users Module)

```
src/backend/modules/users/
  controllers/
    listUsersController.ts       # Validates input, calls service, returns DTO
  services/
    listUsersService.ts           # Business logic, calls repo, uses mapper
  repositories/
    userRepository.ts             # DB queries (Prisma/Supabase)
  dto/
    UserDTO.ts                    # Data shape for UI & controllers
  zod/
    userSchemas.ts                # Input/output validation schemas
  mappers/
    userMapper.ts                 # DB → DTO, DTO → DB conversion
```

---

## 12. Summary Rules for Coding Agents

1. **Pages = RSC only.** Use `authGuard()`, call controllers via server actions/API.
2. **Controllers validate** (Zod), **services contain logic**, **repos query DB**, **mappers convert**.
3. **RSC pages MUST call controllers**, NOT services/repos directly.
4. **Server actions validation:**
   - **Use `safeParse()` NOT `parse()`** for all Zod validation
   - **Include `formatValidationError()` helper** in actions.ts
   - **Throw errors** after validation failures (caught by error.tsx)
   - **Wrap entire action in try-catch**
5. **Server actions and API routes must wrap with:**
   ```ts
   withErrorHandler(withAuth(fn))
   ```
6. **All inputs validated with Zod** in controllers (from `/zod`).
7. **All outputs returned as DTO** (from `/dto`).
8. **Services use mappers** for DB ↔ DTO conversion.
9. **Client components only when absolutely needed.**
10. **Every route folder MUST have** `loading.tsx` and `error.tsx`.
11. **Mutations MUST call** `revalidatePath()` or `revalidateTag()`.

---

## 13. Summary Rules for Developers (Why)

* **RSC keeps JS off the client**, reducing bundle size.
* **Strict layer separation**: Pages → Controllers → Services → Repos → DB.
* **Mappers centralize conversion**, keeping services and controllers focused.
* **Auth split**: Middleware (route protection) + `authGuard()` (RSC) + `withAuth` (API/actions).
* **Zod at boundaries** prevents runtime shape errors.
* **DTOs provide stable contracts** between frontend ↔ backend.
* **Modules under /src/backend/modules** enforce clear domain boundaries.
* **Caching and revalidation** follow modern Next.js best practices.

**For detailed architectural reasoning and real-world engineering context, see:** [DEVELOPMENT_GUIDELINES.md - Architecture Patterns](../5_Guides/DEVELOPMENT_GUIDELINES.md#architecture-patterns)

---

## 14. Developer Deep Dive

**For detailed explanations, rationale, and real-world engineering context, see:**

> [5_Guides/DEVELOPMENT_GUIDELINES.md - Architecture Patterns](5_Guides/DEVELOPMENT_GUIDELINES.md#architecture-patterns)

This includes:
- Why `safeParse()` vs `parse()`
- Why throw errors vs return `{ success, error }`
- How `formatValidationError()` works
- Complete error.tsx boundary examples
- Full working examples with all patterns
- Testing strategies for Server Actions

---

**This document is the authoritative source for all coding agents and developers. Follow these rules for all new pages and backend code.**

The application utilizes a hybrid approach for database access to balance security, multi-tenancy, and administrative needs. This strategy is crucial for maintaining data integrity and system security, especially in a multi-tenant environment.

#### Supabase Client Usage Rules (Authoritative)

To ensure robust security and proper separation of concerns, strict rules govern where the Supabase client can be used:

-   **Allowed Locations:**
    -   `Repository Layer (e.g., src/backend/modules/some-feature/repository.ts)`: Business logic services (often called controllers or services) should interact with the database indirectly through a dedicated repository layer. This layer encapsulates data access logic.
    -   `src/backend/admin/*`: This directory is reserved for backend administrative tasks. It may use the Supabase client with elevated privileges (e.g., `service-role` key) for operations that bypass Row-Level Security (RLS).
    -   `API Route files directly (for delegating to backend services)`: While API route files (`app/api/*`) should be thin wrappers, they are the entry point for backend operations and will call functions that eventually use the Supabase client (see "API Route Architecture" below).

-   **Forbidden Locations:**
    -   **Client Components:** Direct Supabase calls are strictly forbidden from any React client components (files with `'use client'`). This prevents exposing sensitive database interaction logic to the client-side and ensures all user queries go through RLS-protected API routes.
    -   **Service Layer (unless explicitly delegated from repository):** Core business logic services should ideally not directly instantiate or manage the Supabase client, but rather receive it (or a data access interface) from a repository layer.
    -   **Frontend Hooks (`src/lib/hooks`):** Similar to client components, frontend hooks must not make direct Supabase calls. All data fetching for the frontend must occur via Next.js API Routes (`/api/*`).

#### Row-Level Security (RLS) Enforcement

-   **RLS Must Be Enabled:** Row-Level Security (RLS) must be enabled on all user-facing tables in the Supabase database. This is a foundational security measure that ensures users can only access or modify data relevant to them, preventing accidental or malicious data exposure in a multi-tenant application.
-   **Service-Role Key Restriction:** The Supabase `service-role` key, which bypasses RLS, is highly privileged. It **must only be used in `src/backend/admin/*`** or other explicitly designated server-side administrative contexts (e.g., cron jobs). It should **never** be exposed to the client or used in regular user-facing backend logic.

#### Initializing the Supabase Client (Server-Side)

For server-side operations that require the Supabase client (e.g., in API routes that call backend services, or admin functions), it should be initialized securely:

```typescript
// TypeScript// Only in server files (e.g., src/lib/supabase/utils.ts, or within backend services)
import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client instance for server-side operations.
 * This client typically uses environment variables for configuration
 * and is suitable for backend services or API routes.
 * The 'auth' aspect needs to be handled according to session management.
 * @returns A Supabase client instance.
 */
export const createServerSupabase = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,         // Public URL for Supabase project
    process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // Use service role for admin, anon for RLS-protected
  );

// Note: The `!` (non-null assertion operator) is used here because we expect
// these environment variables to always be defined in server environments.
// Ensure your `.env` files are correctly configured.
```
*Explanation for Newcomers:*
- `createClient`: This function comes from the `@supabase/supabase-js` library and is used to connect to your Supabase project.
- `process.env.NEXT_PUBLIC_SUPABASE_URL!`: This refers to your Supabase project's URL. `NEXT_PUBLIC_` prefix means it can be accessed on both client and server, but for security, sensitive keys usually don't have this prefix unless they are intentionally public.
- `process.env.SUPABASE_SERVICE_ROLE_KEY!`: This is a *secret* key that gives full administrative access to your Supabase project, bypassing RLS. It's crucial this is *never* exposed to the client-side.
- `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!`: This is a *public* key that provides access to your Supabase project, but it respects RLS policies. It's safe to expose to the client-side.
- The `!` at the end tells TypeScript that we are certain these environment variables will have a value at runtime. If they might be undefined, you should add checks for safety.

#### Administrative Layer (Prisma Allowed)

Prisma plays a specific, restricted role within the application's data access strategy, primarily for administrative operations that require elevated privileges or bypass RLS.

-   **Prisma's Purpose:** Prisma is an Object-Relational Mapper (ORM) that provides a type-safe way to interact with your database. In this project, it's used for scenarios where direct, RLS-bypassing access is intentionally required.
-   **Allowed Uses (Bypassing RLS):**
    -   **Cron Jobs:** Automated scheduled tasks that might need to access or modify data across all users (e.g., data aggregation, cleanup).
    -   **Analytics / Reporting:** Generating comprehensive reports that involve data from multiple users or system-wide metrics.
    -   **Cache Rebuilding:** Operations to refresh system-level caches that might require full data access.
    -   **Admin Dashboards:** Backend interfaces used by administrators to manage users, content, or system settings.
    -   **Any operation that must bypass RLS:** Any other explicitly approved backend process that requires full, unfiltered database access.
-   **Strict Restriction:** **Never use Prisma in user-facing API routes or main application services** that handle typical user requests. Prisma's usage is confined to specific administrative or system-level backend contexts, always operating with appropriate security considerations.



### 3.4. Frontend Architecture

- **Server-First Architecture with React Server Components (RSC):** The application prioritizes a server-first rendering strategy, leveraging Next.js 14's React Server Components (RSC) to maximize performance and simplify data fetching. This approach is ideal for reducing client-side JavaScript, improving load times, and keeping sensitive data on the server. Client Components are primarily used for adding interactivity to the UI.

- **Theme Switching Support:** All UI components, pages, error boundaries, and loading states must support both light and dark themes. The application uses Tailwind CSS's `dark:` prefix for theme-aware styling, controlled by the `ThemeProvider` in `src/lib/contexts/ThemeContext.tsx`.
  - **Required Pattern:** Always provide both light and dark variants for colors, backgrounds, borders, and text.
  - **Example:**
    ```tsx
    // ✅ Correct - supports both themes
    <div className="bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <p className="text-gray-600 dark:text-gray-300">Content</p>
      </div>
    </div>
    
    // ❌ Incorrect - hardcoded dark theme only
    <div className="bg-gray-950 text-white">
      <div className="bg-gray-900 border border-gray-800">
        <p className="text-gray-300">Content</p>
      </div>
    </div>
    ```
  - **Theme Provider:** The app uses a custom `ThemeProvider` that adds/removes the `dark` class on the document root, supporting `light`, `dark`, and `auto` (system preference) modes.
  - **Skeleton/Loading States:** Loading skeletons must also use theme-aware colors (e.g., `bg-gray-200 dark:bg-gray-800`).
  - **Error Pages:** Error boundaries and error pages must support theme switching.

### 3.5. API Route Architecture

In this project, Next.js API Routes (`app/api/*`) serve as **thin wrappers** around the backend business logic. This architecture ensures that API routes remain clean, focused, and easily maintainable.

-   **Purpose of API Routes:**
    -   Act as the entry point for client-side requests to access server-side functionality.
    -   Handle request parsing (e.g., query parameters, request body).
    -   Delegate the actual work (business logic, database interaction) to dedicated backend modules or services.
    -   Return standardized responses to the client.

-   **"Thin Wrapper" Principle:**
    API Route files should contain **no significant logic, no direct Supabase calls, no Zod schema definitions, and no core business rules.** Their primary responsibility is to receive a request, call the appropriate function in the backend `src/backend/modules` layer, and return its result.

-   **Example:**

    Consider an API route to fetch a user's portfolio:

    ```typescript
    // TypeScript// app/api/portfolio/route.ts
    // This is a Next.js API Route handler.
    // It's intentionally kept minimal.
    import { NextResponse } from 'next/server';
    import { getPortfolio } from '@/backend/modules/portfolio/portfolio.controller'; // Import the backend controller

    /**
     * Handles GET requests to /api/portfolio.
     * This route acts as a thin wrapper, delegating the logic to a backend controller.
     * @returns A JSON response containing the portfolio data or an error.
     */
    export async function GET() {
      try {
        // The API route simply calls a function from the backend business logic layer.
        const portfolio = await getPortfolio();
        return NextResponse.json(portfolio);
      } catch (error) {
        // Basic error handling in the route; more detailed handling occurs in the controller.
        console.error('Error fetching portfolio:', error);
        return NextResponse.json({ message: 'Failed to fetch portfolio' }, { status: 500 });
      }
    }
    ```
    *Explanation for Newcomers:*
    -   `import { getPortfolio from '@/backend/modules/portfolio/portfolio.controller';`: This line is key. It shows that the route isn't doing the work itself; it's importing a function from another file (a "controller" within the backend modules) that contains the actual logic for getting a portfolio.
    -   `export async function GET()`: This is the standard way to define a GET request handler in Next.js API Routes.
    -   `NextResponse.json()`: This is used to send a JSON response back to the client.
    -   By keeping the route file minimal, we ensure that the core business logic is centralized, testable, and reusable across different API endpoints if needed.

### 3.6. UI State Management with React (Transitioning to React Query)

Effective state management is crucial for building responsive and maintainable user interfaces. This project currently utilizes a combination of React's built-in `useState`/`useEffect` hooks and custom hooks for managing UI and server-side state. We are in the process of transitioning to **React Query** for more robust server state management.

#### Current State Management Approach

The current approach relies heavily on standard React hooks and custom hooks located in `src/lib/hooks`.

-   **Data Fetching:** Portfolio data, stock details, and other market data are fetched on-demand via custom hooks (e.g., `usePortfolio()`, `useStocks()`, `usePortfolioMetrics()`) which internally use `useState` and `useEffect` to manage loading, error, and data states.
    -   **Example from `lib/hooks/useDatabase.ts` pattern:**
        ```typescript
        // ✅ GOOD - lib/hooks/useDatabase.ts pattern
        export function usePortfolio(type: string) {
          const [portfolio, setPortfolio] = useState(null);
          const [loading, setLoading] = useState(true);

          useEffect(() => {
            // fetch logic (e.g., fetch('/api/portfolio?type=${type}'))
            // setPortfolio(data);
            // setLoading(false);
          }, [type]);

          return { portfolio, loading, error };
        }
        ```
    -   **Anti-Pattern: Duplicating Logic:** Avoid re-implementing fetching logic directly in multiple components.
        ```typescript
        // ❌ BAD - duplicating logic in components
        function Component1() {
          const [portfolio, setPortfolio] = useState(null);
          useEffect(() => { /* fetch */ }, []);
        }
        function Component2() {
          const [portfolio, setPortfolio] = useState(null);
          useEffect(() => { /* same fetch */ }, []);
        }
        ```

-   **Local UI State:** Local React state (`useState`) is used for managing UI-specific interactions like sorting, filtering, form input values, and component visibility (e.g., modals, expanded states).
    -   **Best Practice: Lift State Only When Necessary:** Keep state as local as possible to the component that uses it.
        ```typescript
        // ✅ GOOD - local state when possible
        function StockCard({ stock }: Props) {
          const [expanded, setExpanded] = useState(false);
          // 'expanded' state is only used within StockCard
        }

        // ❌ BAD - unnecessary lifting
        function Parent() {
          const [expanded, setExpanded] = useState({}); // 'expanded' might be unused elsewhere, causing unnecessary re-renders
          return <StockCard expanded={expanded[stock.id]} />;
        }
        ```

-   **Avoiding Stale Closures:** Always ensure `useEffect` dependencies are correctly specified to prevent outdated values from being used inside the effect's closure.
    ```typescript
    // ✅ GOOD
    useEffect(() => {
      async function fetchData() {
        const data = await fetch(`/api/stocks?type=${portfolioType}`);
        // ...
      }
      fetchData();
    }, [portfolioType]); // 'portfolioType' is correctly tracked as a dependency

    // ❌ BAD
    useEffect(() => {
      fetch(`/api/stocks?type=${portfolioType}`); // 'portfolioType' could be stale if not in dependencies
    }, []); // Missing dependency
    ```

#### Future State: Leveraging React Query

We are adopting **React Query (also known as TanStack Query)** to manage "server state" (data fetched from APIs) more efficiently and robustly. React Query provides powerful tools for caching, synchronization, and updating server data without touching global state.

-   **Why React Query?**
    -   **Eliminates Manual Caching:** Handles data caching, deduplication of requests, and automatic re-fetching in the background.
    -   **Simplified Loading & Error States:** Provides `isLoading`, `isError`, `data`, `error` properties out-of-the-box, simplifying UI handling.
    -   **Optimistic Updates:** Makes implementing optimistic UI updates much easier.
    -   **Background Data Sync:** Keeps UI data fresh by revalidating data in the background.
    -   **Focus on UI State:** Allows developers to focus on managing pure UI state with `useState`/`useReducer`.

-   **Integrating React Query:**
    A `QueryProvider` component (e.g., `components/QueryProvider.tsx`) will wrap the application to make React Query available globally.

-   **Example: Migrating to `useQuery`:**

    Instead of a custom `usePortfolio` hook managing its own `useState` and `useEffect` for data, `useQuery` will be used:

    ```typescript
    // TypeScript// lib/hooks/usePortfolio.ts (example with React Query)
    import { useQuery } from '@tanstack/react-query';

    async function fetchPortfolioData(type: string) {
      const response = await fetch(`/api/portfolio?type=${type}`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    }

    export function usePortfolio(type: string) {
      return useQuery({
        queryKey: ['portfolio', type], // Unique key for this query
        queryFn: () => fetchPortfolioData(type), // Function to fetch data
        staleTime: 1000 * 60 * 5, // Data considered fresh for 5 minutes
        // Other options: refetchOnWindowFocus, retry, onError, onSuccess etc.
      });
    }

    // In a component:
    // const { data: portfolio, isLoading, isError, error } = usePortfolio('energy');
    ```
    *Explanation for Newcomers:*
    -   `useQuery`: The main hook from React Query.
    -   `queryKey`: A unique array used by React Query to identify and cache the data for this specific query. If `type` changes, React Query knows it's a different query.
    -   `queryFn`: The actual function that performs the data fetching (e.g., making an API call).
    -   `staleTime`: How long the data is considered "fresh". After this time, React Query will re-fetch in the background when the component mounts or refetches.

-   **Coexistence with Local UI State:**
    React Query excels at server state. For purely client-side UI states (like modal open/close, form input values before submission, hover states), standard `useState` and `useReducer` will continue to be the appropriate tools. This creates a clear separation: React Query for *what to show* from the server, and React hooks for *how to interact* with the UI.



## Common Commands

### Build Command (REQUIRED)
Always use the following command to build, so that .env.local is loaded:
```bash
npx dotenv -e .env.local -- npm run build
```

### Development
```bash
npm run dev          # Start Next.js dev server with hot reload
npm run build        # Production build (generates .next folder)
npm start            # Start production server
npm test             # Run all tests with Jest
```

**Optional commands (not yet configured in package.json):**
```bash
npm run dev:turbo    # Start with Turbopack (faster, experimental) - Add to package.json: "dev:turbo": "next dev --turbo"
npm run lint         # Run ESLint - Add to package.json: "lint": "next lint"
npm run type-check   # TypeScript validation - Add to package.json: "type-check": "tsc --noEmit"
```

### Code Generation
```bash
npx create-next-app@latest          # Create new Next.js app (for reference)
npx @next/codemod@latest            # Run codemods for Next.js upgrades
npx shadcn-ui@latest init           # Initialize shadcn/ui (if using component library)
```

### Testing
```bash
npm test                                        # Run all tests
npx jest tests/path/to/test.spec.ts --runInBand # Run single test file
npx jest --watch                                # Run tests in watch mode
npx jest --coverage                             # Generate coverage report
```

### Database (Prisma)
```bash
npx prisma generate              # Generate Prisma client
npx prisma db push               # Push schema changes to DB
npx prisma studio                # Open Prisma Studio GUI
npx tsx scripts/seed-db.ts       # Seed database
npx tsx scripts/check-db.ts      # Check database state
```

### Scripts
```bash
npx tsx scripts/populate-positions.ts   # Populate stock positions
npx tsx scripts/populate-theses.ts      # Populate investment theses
npx tsx scripts/test-e2e.ts             # End-to-end integration test
npx tsx scripts/test-models.ts          # Test database models
```




## Environment Variables

Required keys (see `.env.local.example`):

```bash
ALPHAVANTAGE_API_KEY=     


## Project-Specific Details
## Key Features

Key features:
- 70/30 cash-margin portfolio tracking
- Live commodity prices (WTI, NG, Copper via Polygon)
- Stop-Loss (-30%) and Take-Profit (+50%) alerts
- DRIP (Dividend Reinvestment)
- Investment thesis management with health scoring
- Daily checklist system with streak tracking
- Risk metrics (Sharpe, Sortino, Alpha, Beta, Calmar)
- AI-powered insights via Google Gemini
- SEC EDGAR filings integration
- News scraping (NewsAPI, Brave Search, Finnhub)




### API Provider System

The app uses **Alpha Vantage by default** for stock quotes (`app/api/quote/route.ts:6`) because:
- FMP free tier doesn't support OTC stocks (TRMLF, AETUF)
- Need USD prices, not CAD from .TO symbols

**Available providers:**
- Alpha Vantage: `lib/api/alphavantage.ts` (25 requests/day, batch supported)
- FMP: `lib/api/fmp.ts` (250 requests/day, uses /stable endpoints)
- Yahoo Finance: `lib/api/yahooFinance.ts` (fundamentals only)
- Finnhub: `lib/api/finnhub.ts` (news)
- Brave Search: `lib/api/braveSearch.ts` (news)
- SEC EDGAR: `lib/api/secEdgar.ts` (filings)

**Switching providers:** Edit `app/api/quote/route.ts:6` to use `process.env.STOCK_API_PROVIDER` instead of hardcoded 'alphavantage'.



### Core Calculation Logic

All portfolio calculations are centralized in `lib/calculator.ts`:

- **Risk metrics** (Sharpe, Sortino, Alpha, Beta, Calmar, Max Drawdown)
- **Position sizing** with cash/margin split
- **Value calculations** considering borrowed amounts
- **Returns computation** for risk analysis

Risk metrics exposed via `/api/risk-metrics` route and displayed in `RiskMetricsPanel` component.



### Caching Strategy

**Multi-layer caching:**

1. **LocalStorage** (`lib/cache.ts`): Client-side API response caching with timestamps
2. **IndexedDB** (`lib/storage.ts`): Persistent browser storage for offline support
3. **AI Cache** (`lib/aiCache.ts`): Google Gemini prompt caching (15min TTL)
4. **Rate limit tracking** (`lib/rateLimitTracker.ts`): In-memory API quota management

**Error handling:** `classifyApiError()` in `lib/cache.ts` categorizes API failures (rate limit, network, auth, etc.)



### AI Integration

**Google Gemini** (`lib/ai/gemini.ts`):
- Models: gemini-2.0-flash-exp, gemini-exp-1206
- System instructions in `lib/ai/systemInstructions.ts`
- Context management in `lib/ai/context.ts`
- Caching via `lib/aiCache.ts`

**AI Component:** `components/StonksAI/StonksAI.tsx` - Sidebar chat interface



## Testing
```bash
npm test                                        

## Git Workflow

**Husky:** Pre-commit hooks configured in `.husky/`

**Current branch:** main (deploy branch for Vercel)

---

## Development Guidelines Summary

### Critical Principles

1. **Server-First Architecture:** Use Server Components for data fetching. Client Components only for interactivity.
2. **API Routes are Thin Wrappers:** Delegate all logic to `src/backend/modules/` controllers.
3. **No Direct Supabase on Frontend:** All data access via `/api/*` routes.
4. **TypeScript Strict Mode:** No `any` types. Always type function returns.
5. **Path Aliases Required:** Use `@lib/`, `@/components/`, never `../../../`.

### Code Patterns

**Import Order:**
```typescript
// 1. Next.js imports
import { NextResponse } from 'next/server';
// 2. Third-party packages
import { z } from 'zod';
// 3. Path aliases
import { prisma } from '@lib/prisma';
import { Portfolio } from '@/types/portfolio';
// 4. Relative imports (same directory only)
import { helper } from './utils';
```

**Server Component (data fetching):**
```typescript
// ✅ GOOD - Server Component fetches data
async function PortfolioPage() {
  const portfolio = await prisma.portfolio.findFirst();
  return <PortfolioDisplay portfolio={portfolio} />;
}
```

**Client Component (interactivity only):**
```typescript
// ✅ GOOD - Client Component for interactivity
'use client';
import { useState } from 'react';

export function SortButton() {
  const [sortOrder, setSortOrder] = useState('asc');
  return <button onClick={() => setSortOrder('desc')}>Sort</button>;
}
```

**API Route Pattern:**
```typescript
// app/api/portfolio/route.ts - THIN WRAPPER
import { NextResponse } from 'next/server';
import { getPortfolio } from '@/src/backend/modules/portfolio/portfolio.controller';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const result = await getPortfolio(request);
    return NextResponse.json(result);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ status: 'error', message: 'Internal error' }, { status: 500 });
  }
}
```

### Error Handling

**View Layer:** Use `error.tsx` for route segments, `global-error.tsx` for app-level.

**Controller Layer:** Try-catch with standardized JSON responses:
```typescript
return NextResponse.json({ status: 'error', message: 'Validation failed' }, { status: 400 });
```

**Service Layer:** Throw custom errors (e.g., `NotFoundError`, `ValidationError`).

### State Management

- **Server State:** Use React Query (`useQuery`, `useMutation`)
- **UI State:** Use `useState`, `useReducer` for local interactivity
- **No Global State:** Avoid Redux/Context for server data

### Caching Strategy

Multi-layer caching configured via `src/lib/config/`:
- **Distributed Cache:** Vercel KV / Upstash Redis (60-80% hit rate target)
- **TTLs by Tier:** Free tier gets longer TTLs, Premium gets fresher data

```typescript
import { getCacheAdapter } from '@lib/cache/adapter';
import { getCacheTTL } from '@lib/config/cache-ttl.config';

const cache = getCacheAdapter();
const ttl = getCacheTTL('quotes', userTier);
await cache.set(`quote:${symbol}:v1`, data, ttl);
```

### Database Access

**User-facing operations:** Supabase client (RLS-protected)
**Admin operations:** Prisma (RLS-bypass, restricted to `src/backend/admin/`)

```typescript
// ✅ GOOD - Centralized Prisma client
import { prisma } from '@lib/prisma';

// ✅ GOOD - Handle null results
const stock = await prisma.stock.findUnique({ where: { id } });
if (!stock) throw new Error('Stock not found');
```

### Security Checklist

- [ ] No `NEXT_PUBLIC_` prefix on secrets
- [ ] Input validation with Zod on all endpoints
- [ ] Never log API keys or PII
- [ ] Use parameterized queries (Prisma handles this)

### Performance Checklist

- [ ] Server Components for data fetching
- [ ] `next/image` for all images
- [ ] Batch API calls (`Promise.all`)
- [ ] Memoize expensive calculations (`useMemo`)
- [ ] Lazy load heavy components (`dynamic()`)

### Code Review Checklist

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
- [ ] Theme switching supported (light/dark via `dark:` classes)
- [ ] API routes have `dynamic = 'force-dynamic'` export
- [ ] Database queries check for null/undefined results
- [ ] External API calls respect rate limits and use caching
- [ ] React components have proper key props (not index)
- [ ] Environment variables are not hardcoded
- [ ] Sensitive data (API keys) never logged
- [ ] Prisma client used from `@lib/prisma` (not re-instantiated)
- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npx dotenv -e .env.local -- npm run build`
- [ ] Console has no errors in browser dev tools

---




