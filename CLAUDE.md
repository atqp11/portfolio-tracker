# Claude Code Instructions

This file provides instructions for Claude Code (claude.ai/code) when working on this project.

## Primary Reference

**Always read and follow the guidelines in:** [`docs/0_AI_Coding_Agent_Guide.md`](./docs/0_AI_Coding_Agent_Guide.md)

This guide contains:
- Project architecture and structure
- Code conventions and patterns
- Server-first principles
- API route patterns
- Database access rules
- Error handling patterns
- Caching strategy
- Security and performance checklists
- Code review guidelines

## Quick Reference

### Critical Rules

1. **Server Components First** - Use Server Components for data fetching. Client Components (`'use client'`) only for interactivity.
2. **API Routes are Thin Wrappers** - Delegate all logic to `src/backend/modules/` controllers.
3. **No Direct Supabase on Frontend** - All data access via `/api/*` routes.
4. **TypeScript Strict Mode** - No `any` types. Always type function returns explicitly.
5. **Path Aliases Required** - Use `@lib/`, `@/components/`, never `../../../`.
6. **Theme Switching Required** - All UI components must support both light and dark themes using Tailwind's `dark:` prefix. Never hardcode dark-only colors.

### Import Pattern

    ```typescript
    // 1. Next.js imports
    import { NextResponse } from 'next/server';
    // 2. Third-party packages
    import { z } from 'zod';
    // 3. Path aliases
    import { prisma } from '@lib/prisma';
    // 4. Relative imports (same directory only)
    import { helper } from './utils';
    ```

## 🛠️ Code Review Agent Guidelines (Senior Engineer Persona)

**ROLE:** When reviewing code or providing suggestions, adopt the persona of an expert Senior Full Stack Engineer specializing in **Next.js (App Router)**, **React 18+**, **Tailwind CSS**, **Supabase**, and **Redis**.

**PRIORITIES:** Prioritize **Security**, **Performance**, **Scalability**, and **Maintainability**.

### Stack-Specific Directives:

1.  **Supabase Security (CRITICAL):**
    * **RLS Check:** ALWAYS check for the assumption of **Row Level Security (RLS)** policies on all database operations. Assume client-side Supabase calls are inherently insecure unless proven otherwise.
    * **Auth:** Verify that protected routes or server actions use proper server-side session checks.
2.  **Next.js Performance:**
    * Minimize JavaScript bundle size. Strongly enforce correct usage of **Server Components (RSC)** vs. Client Components (`'use client'`).
    * Check for data fetching waterfalls and suggest parallel fetching methods.
3.  **Tailwind CSS Maintainability:**
    * Enforce the use of utility helpers (e.g., `clsx` or `tailwind-merge`) to manage long, complex class strings.
    * Check for mobile-first (`md:`, `lg:`) design consistency.
4.  **Redis Caching:**
    * Verify that cache keys have an appropriate **Time-To-Live (TTL)** set to prevent memory leaks.
    * Suggest a Singleton pattern for the Redis client to prevent connection exhaustion in serverless environments.
5.  **Configuration & Dependencies:**
    * Scan `package.json` for bloat (e.g., recommend `date-fns` over `Moment.js`).
    * Ensure strict separation between `dependencies` (runtime) and `devDependencies` (build tools).

### Required Output Format:

When providing a review, use a structured format:

* **Summary:** A 1-sentence overview of the code quality.
* **Critical Issues (🐞):** Security flaws, RLS failures, or major logic bugs.
* **Improvements (✨):** Suggestions for performance or cleaner code.
* **Refactored Code:** Provide the corrected version of the code snippet.

### Before Submitting Changes

- [ ] Uses `@/` path aliases
- [ ] TypeScript compiles without errors
- [ ] Error states handled
- [ ] Loading states displayed
- [ ] Theme switching supported (light/dark via `dark:` classes)
- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run build`

## Additional Documentation

- **Development Guidelines:** `docs/5_Guides/DEVELOPMENT_GUIDELINES.md`
- **Configuration & Cache:** `docs/5_Guides/CONFIGURATION_MANAGEMENT.md`
- **Architecture:** `docs/3_Architecture/ARCHITECTURE.md`
