# GitHub Copilot Coding Agent Instructions

This project follows strict architectural patterns and coding guidelines defined in:
**docs/0_AI_Coding_Agent_Guide.md**

## Primary Reference Document

All coding decisions, architecture patterns, and implementation details MUST follow the guidelines in:
- `docs/0_AI_Coding_Agent_Guide.md`

This document contains:
- Next.js 16+ RSC-first architecture patterns
- Backend module structure (`src/backend/modules/*`)
- Layer responsibilities (Controllers, Services, Repositories, Mappers, DTOs)
- Authentication and authorization patterns
- Database access rules (Supabase RLS, Prisma for admin)
- API route architecture (thin wrappers)
- Caching strategies
- Error handling patterns
- Testing requirements

## Quick Reference

When implementing features, always:
1. Read and follow `docs/0_AI_Coding_Agent_Guide.md` first
2. Use Server Components by default (RSC-first)
3. Follow the strict layer separation: Pages → Controllers → Services → Repositories
4. Use DTOs for all data boundaries
5. Validate with Zod schemas in controllers
6. Use mappers for DB ↔ DTO conversion in services
7. Never use Supabase client in Client Components
8. Use `authGuard()` in RSC pages, `withAuth` wrappers in API routes
9. Include `loading.tsx` and `error.tsx` for every route folder
10. Call `revalidatePath()` after mutations

## Project Context

This is a Next.js 16+ portfolio tracking application with:
- Multi-tenant architecture with RLS
- Hybrid database access (Supabase for user-facing, Prisma for admin)
- Server-first rendering with React Server Components
- Backend organized under `src/backend/modules/*` with MVC-like structure

## Architecture Patterns

### Layer Responsibilities

**Pages (RSC):**
- Call controller methods, NOT services or repositories directly
- Be server components unless interactivity required
- Use `authGuard()` for protected pages

**Controllers:**
- Validate input using Zod schemas from `/zod`
- Call service layer
- Return DTOs defined in `/dto`

**Services:**
- Implement domain/business logic
- Call repositories for data access
- Use mappers for DB → DTO conversion
- Return DTOs to controllers

**Repositories:**
- Query DB (Prisma/Supabase/etc)
- Return raw DB models

**Mappers:**
- Convert DB → DTO
- Convert DTO → DB (for mutations)
- Pure functions with no side effects

### Database Access Rules

- **Supabase Client:** Only in Repository layer or `src/backend/admin/*`
- **Never in Client Components:** All data access via `/api/*` routes
- **Prisma:** Only for admin operations that bypass RLS
- **RLS Must Be Enabled:** On all user-facing tables

### API Route Architecture

API routes (`app/api/*`) are **thin wrappers** that:
- Parse request parameters
- Call backend controllers from `src/backend/modules/*`
- Return standardized responses
- **MUST NOT** contain business logic, direct DB calls, or Zod schemas

### Authentication Patterns

- **RSC Pages:** Use `authGuard()` for authorization checks
- **API Routes/Server Actions:** Use `withAuth` and `withErrorHandler` wrappers
- **Never wrap:** Services, Repositories, or Mappers

### Error Handling

- Every route folder MUST have `loading.tsx` and `error.tsx`
- Controllers use try-catch with standardized JSON responses
- Services throw custom errors (e.g., `NotFoundError`, `ValidationError`)

### Caching

- Use RSC `fetch()` with built-in caching
- For dynamic content: `fetch(url, { cache: "no-store" })`
- Mutations MUST call `revalidatePath()` or `revalidateTag()`
