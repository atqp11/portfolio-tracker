# Gemini Technical Handbook

This document provides a comprehensive overview of the project's architecture, data strategies, and development workflows. It serves as a guide for developers and AI assistants (like Gemini) working on this codebase.

## 1. Project Overview

This project is a portfolio tracker application built with a modern web stack. It provides users with tools to monitor their investments, analyze market data, and manage their financial portfolio.

**Core Technologies:**
- **Frontend:** Next.js (React) with TypeScript
- **Backend:** Next.js API Routes, running on Node.js
- **Database:** Supabase (PostgreSQL)
- **ORM:** Prisma (for specific use cases)
- **Data Validation:** Zod

## 2. Project Structure

The project follows a standard Next.js `app` directory structure, with a clear separation of concerns.

```
/
├── app/                  # Next.js 14 App Router
│   ├── (protected)/      # Routes requiring authentication
│   ├── (public)/         # Publicly accessible routes
│   ├── api/              # API Route handlers (backend)
│   └── ...
├── components/           # Reusable React components
├── src/
│   ├── backend/          # Server-side business logic and services
│   ├── lib/              # Shared libraries, hooks, and utilities
│   └── ...
├── prisma/               # Prisma schema and generated client
└── ...
```

## 3. Architecture Deep Dive

### 3.1. Layer Separation

The application is designed with distinct layers to ensure maintainability and scalability.

- **Presentation Layer (Frontend):** Located in `app/` and `components/`. This layer is responsible for the user interface and user experience. It is built with React and Next.js, following a client-first rendering strategy.
- **API Layer (Backend For Frontend):** Located in `app/api/`. These are Next.js API routes that act as a gateway between the frontend and backend services. They handle request validation, authentication, and data transformation.
- **Business Logic Layer:** Located in `src/backend/modules/`. This layer contains the core business logic of the application, independent of the web framework.
- **Data Access Layer:** This layer is responsible for all database interactions. It employs a hybrid strategy, using both Supabase's RLS-protected client and Prisma.

### 3.2. Data Strategy

#### Data Transfer Objects (DTOs) and Validation

- **Zod as the Contract Language:** Zod is the primary tool for defining data schemas and validating data in motion. It serves as a "single source of truth" for the structure of data moving between the client and server (API requests/responses) and between different layers of the backend. This ensures type safety and data integrity across the entire application.

```typescript
// Example of a Zod schema for a user profile update
import { z } from 'zod';

export const updateUserProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long."),
  email: z.string().email("Invalid email address."),
});

export type UpdateUserProfileDTO = z.infer<typeof updateUserProfileSchema>;
```

#### Source of Truth

- **Supabase as the Ultimate Source of Truth:** The Supabase PostgreSQL database is the definitive source of truth for all data at rest. All application data is persisted here, and its integrity is paramount.

### 3.3. Hybrid Database Access Strategy

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

- **Client-Side Generation First:** The application prioritizes a client-side rendering (CSR) and generation strategy. Most pages are interactive and handle data fetching on the client. This approach is well-suited for highly dynamic applications where real-time data and user interaction are key. Server-Side Generation (SSG) or Server Components may be used for static content pages like landing pages or blog posts.

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

### 3.7. Form Handling and Mutations with Server Actions

Next.js Server Actions provide a powerful way to handle form submissions and data mutations directly on the server, offering benefits like improved performance, security, and progressive enhancement.

#### Pattern: Validate → Mutate → Revalidate

This is the standard, recommended flow for form submissions using Server Actions.

1.  **Validate:** Define a schema (e.g., using Zod) to validate incoming form data. This happens on the server before any mutation.
2.  **Mutate:** Perform the necessary database operations or other mutations.
3.  **Revalidate:** Invalidate and re-fetch any cached data that has become stale due to the mutation, ensuring the UI reflects the latest state.

-   **Server Action Definition (e.g., `app/actions/stocks.ts`):**

    ```typescript
    // TypeScript// app/actions/stocks.ts
    'use server'; // Marks all exported functions in this file as Server Actions

    import { z } from 'zod';
    import { revalidatePath } from 'next/cache';
    import { prisma } from '@lib/prisma'; // Assuming @lib/prisma points to your Prisma client setup

    // 1. VALIDATE - Define schema for expected form data
    const UpdateStockSchema = z.object({
      stockId: z.string().cuid(), // Validates it's a CUID
      shares: z.number().int().positive().max(1000000),
      avgPrice: z.number().positive().max(100000)
    });

    /**
     * Updates a stock's shares and average price in the database.
     * This function runs exclusively on the server.
     * @param formData The FormData object from the client-side form submission.
     * @returns An object indicating success and the updated stock data.
     */
    export async function updateStock(formData: FormData) {
      // Validate input using the defined Zod schema
      const rawData = {
        stockId: formData.get('stockId') as string,
        shares: Number(formData.get('shares')),
        avgPrice: Number(formData.get('avgPrice'))
      };

      // If validation fails, Zod throws an error which can be caught client-side or handled by an error boundary.
      const validated = UpdateStockSchema.parse(rawData);

      // 2. MUTATE - Update database with validated data
      const updated = await prisma.stock.update({
        where: { id: validated.stockId },
        data: {
          shares: validated.shares,
          avgPrice: validated.avgPrice,
          lastUpdated: new Date()
        }
      });

      // 3. REVALIDATE - Refresh cached data for relevant paths
      revalidatePath('/portfolio'); // Revalidate the portfolio page cache
      revalidatePath(`/stocks/${validated.stockId}`); // Revalidate a specific stock's page cache

      return { success: true, stock: updated };
    }
    ```

-   **Client Component using the Server Action (e.g., `components/UpdateStockForm.tsx`):**
    This component uses the `action` prop of the `<form>` element to directly call the Server Action. It also includes basic state management for error and pending states.

    ```typescript
    // TypeScript// components/UpdateStockForm.tsx
    'use client'; // This component runs on the client, but interacts with a Server Action

    import { updateStock } from '@app/actions/stocks'; // Import the Server Action
    import { useState } from 'react';

    interface UpdateStockFormProps {
      stock: {
        id: string;
        shares: number;
        avgPrice: number;
      };
    }

    export function UpdateStockForm({ stock }: UpdateStockFormProps) {
      const [error, setError] = useState<string | null>(null);
      const [pending, setPending] = useState(false); // To show loading state

      async function handleSubmit(formData: FormData) {
        setPending(true); // Indicate loading
        setError(null); // Clear previous errors

        try {
          // Call the Server Action directly
          const result = await updateStock(formData);
          // If successful, Next.js handles revalidation automatically via revalidatePath
          // Further client-side success handling can go here (e.g., show a toast)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Update failed');
        } finally {
          setPending(false); // End loading
        }
      }

      return (
        <form action={handleSubmit} className="space-y-4 p-4 border rounded">
          <input type="hidden" name="stockId" value={stock.id} />

          <div>
            <label htmlFor="shares" className="block text-sm font-medium text-gray-700">Shares:</label>
            <input
              type="number"
              id="shares"
              name="shares"
              defaultValue={stock.shares}
              disabled={pending} // Disable input while pending
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            />
          </div>

          <div>
            <label htmlFor="avgPrice" className="block text-sm font-medium text-gray-700">Average Price:</label>
            <input
              type="number"
              id="avgPrice"
              name="avgPrice"
              defaultValue={stock.avgPrice}
              disabled={pending} // Disable input while pending
              step="0.01" // Allow decimal values for price
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={pending} // Disable button while pending
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {pending ? 'Updating...' : 'Update Stock'}
          </button>

          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </form>
      );
    }
    ```

#### Progressive Enhancement (Works Without JavaScript)

A significant advantage of Server Actions is progressive enhancement. Even if JavaScript is disabled or fails to load, forms using the `action` prop will still function as traditional HTML form submissions, sending data to the server action.

```typescript
// TypeScript// components/ProgressiveForm.tsx
// This form will work even if JavaScript is disabled in the browser.
export function ProgressiveForm({ stock }: { stock: { id: string; shares: number; avgPrice: number; } }) {
  return (
    <form action={updateStock}>  {/* Direct Server Action call */}
      <input type="hidden" name="stockId" value={stock.id} />
      <input type="number" name="shares" defaultValue={stock.shares} />
      <button type="submit">Update</button>
    </form>
  );
}
```

#### Optimistic Updates

Optimistic UI updates provide instant user feedback by updating the UI immediately after an action, then reverting if an error occurs. Next.js, in conjunction with React's `useOptimistic` hook, makes this pattern manageable.

-   **Pattern: Update UI Immediately, Rollback on Error**
    This enhances perceived performance, making the application feel faster and more responsive.

-   **Using `useOptimistic` (e.g., `components/StockList.tsx`):**
    The `useOptimistic` hook allows you to apply a temporary update to the UI that will be automatically rolled back if the server action fails, or overwritten by the actual server response if successful.

    ```typescript
    // TypeScript// components/StockList.tsx
    'use client';

    import { useOptimistic, useState } from 'react';
    import { updateStock } from '@app/actions/stocks'; // Import the Server Action

    interface Stock {
      id: string;
      shares: number;
      avgPrice: number; // Include avgPrice as required by updateStock
      // ... other stock properties
    }

    interface StockListProps {
      stocks: Stock[];
      // Assume a StockCard component exists that takes an onUpdate prop
      // For simplicity, we'll inline the update logic here.
    }

    export function StockList({ stocks: initialStocks }: StockListProps) {
      // useOptimistic takes the initial state and a function to update the optimistic state
      const [optimisticStocks, addOptimisticUpdate] = useOptimistic(
        initialStocks,
        // This function describes how the UI should optimistically change
        (currentStocks: Stock[], newStockUpdate: Partial<Stock> & { id: string }) => {
          return currentStocks.map(s =>
            s.id === newStockUpdate.id ? { ...s, ...newStockUpdate } : s
          );
        }
      );

      // We might need local state for individual stock updates,
      // or pass down update handlers to child components.
      // For this example, let's assume `handleUpdate` is triggered by a child.
      async function handleUpdate(stockId: string, shares: number) {
        // 1. Optimistically update UI immediately
        const stockToUpdate = optimisticStocks.find(s => s.id === stockId);
        if (!stockToUpdate) return; // Should not happen if stockId is valid

        const optimisticStock = {
          ...stockToUpdate,
          shares // Apply the optimistic change
        };
        addOptimisticUpdate(optimisticStock); // Dispatch the optimistic update

        try {
          // 2. Perform actual mutation via the Server Action
          const formData = new FormData();
          formData.append('stockId', stockId);
          formData.append('shares', String(shares));
          formData.append('avgPrice', String(stockToUpdate.avgPrice)); // Include if `updateStock` needs it

          await updateStock(formData);
          // 3. Success - Next.js will automatically revalidate relevant paths,
          // causing the UI to eventually reflect the true server state.
        } catch (error) {
          // 4. Error - UI automatically rolls back to the original state (or previous successful state)
          // useOptimistic handles the rollback implicitly for you.
          console.error('Update failed:', error);
          alert('Failed to update stock. Please try again.');
          // You might manually trigger a re-fetch here if useOptimistic doesn't fully revert complex cases
        }
      }

      return (
        <div className="space-y-4">
          {optimisticStocks.map(stock => (
            // Render your stock cards or items.
            // You would typically pass `handleUpdate` down to a `StockCard` component.
            <div key={stock.id} className="p-3 border rounded-md flex justify-between items-center">
              <span>Stock ID: {stock.id}, Shares: {stock.shares}</span>
              <button
                onClick={() => handleUpdate(stock.id, stock.shares + 1)}
                className="ml-4 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                +1 Share (Optimistic)
              </button>
            </div>
          ))}
        </div>
      );
    }
    ```

-   **Manual Optimistic Updates (without `useOptimistic`):**
    For simpler scenarios or when `useOptimistic` isn't feasible, you can implement optimistic updates manually using `useState` and careful state management.

    ```typescript
    // TypeScript// components/StockCardManualOptimistic.tsx
    'use client';

    import { useState } from 'react';
    import { updateStock } from '@app/actions/stocks'; // Import the Server Action

    interface StockCardManualOptimisticProps {
      stock: {
        id: string;
        shares: number;
        // ... other stock properties
        avgPrice: number; // Required by updateStock
      };
    }

    export function StockCardManualOptimistic({ stock }: StockCardManualOptimisticProps) {
      const [localShares, setLocalShares] = useState(stock.shares);
      const [isSaving, setIsSaving] = useState(false);
      const [error, setError] = useState<string | null>(null);

      async function handleSave(newShares: number) {
        setError(null);
        // Store current shares to revert on error
        const previousShares = localShares;

        // 1. Optimistic update: Update UI immediately
        setLocalShares(newShares);
        setIsSaving(true);

        try {
          // Simulate FormData for the Server Action
          const formData = new FormData();
          formData.append('stockId', stock.id);
          formData.append('shares', String(newShares));
          formData.append('avgPrice', String(stock.avgPrice)); // Include if required by action

          await updateStock(formData);
          // Success: UI already reflects the change, revalidation will sync eventually.
        } catch (err) {
          // 2. Rollback on error: Revert UI to previous state
          setLocalShares(previousShares);
          setError(err instanceof Error ? err.message : 'Update failed');
          alert('Update failed: ' + (err instanceof Error ? err.message : 'Please try again.'));
        } finally {
          setIsSaving(false);
        }
      }

      return (
        <div className="p-3 border rounded-md flex justify-between items-center bg-gray-50">
          <span>{stock.id} - Shares: {localShares}</span>
          <div className="flex items-center">
            <button
              onClick={() => handleSave(localShares - 1)}
              disabled={isSaving || localShares <= 0}
              className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              -
            </button>
            <span className="mx-2">{localShares}</span>
            <button
              onClick={() => handleSave(localShares + 1)}
              disabled={isSaving}
              className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              +
            </button>
            {isSaving && <span className="ml-2 text-blue-500">(Saving...)</span>}
          </div>
          {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
        </div>
      );
    }
    ```

## 4. Development Workflow

### 4.1. Prisma and Supabase Schema Synchronization

When the Supabase database schema changes, the Prisma schema must be updated to reflect these changes. This ensures that Prisma's generated client matches the database structure.

**Steps for generating the Prisma schema:**

1.  **Pull latest database changes (if necessary):**
    Ensure your local database schema is up-to-date with the latest migrations from Supabase.

2.  **Introspect the database:**
    Run the following Prisma CLI command. This command will connect to your database (specified by the `DATABASE_URL` in your `.env` file) and generate the `schema.prisma` file based on the existing tables and columns.

    ```bash
    npx prisma db pull
    ```

3.  **Generate the Prisma Client:**
    After the schema has been updated, you need to generate the Prisma Client to have types and methods available that reflect the new schema.

    ```bash
    npx prisma generate
    ```

By following this process, you can ensure that your Prisma client remains synchronized with your Supabase database, providing a type-safe way to interact with your data for administrative and internal queries.


## 5. Documentation Files

- `DEVELOPMENT_GUIDELINES.md` - This document outlines critical guidelines and anti-patterns to ensure code quality, maintainability, and adherence to the project's architectural decisions.
