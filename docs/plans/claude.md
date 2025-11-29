CLAUDE.md — Engineering Handbook Edition
Full Architecture, Conventions, and AI Assistant Rules for This Repository

Version: Complete Engineering Handbook
Audience: Engineers + AI coding assistants (Claude, ChatGPT, Copilot, Gemini)

📑 Table of Contents

- [Introduction & Philosophy](#1-introduction--philosophy)
- [Core Architecture Overview](#2-core-architecture-overview)
- [Request Lifecycle — Full Path](#3-request-lifecycle--full-path)
- [Project Directory Structure (Authoritative)](#4-project-directory-structure-authoritative)
- [Backend Design — Controllers, Services, Repositories](#5-backend-design--controllers-services-repositories)
- [Supabase Rules (The Source of Truth)](#6-supabase-rules-the-source-of-truth)
- [Admin Layer — Prisma Allowed](#7-admin-layer--prisma-allowed)
- [API Route Architecture (Next.js App Router)](#8-api-route-architecture-nextjs-app-router)
- [Zod as Primary Contract Language](#9-zod--primary-contract-language)
- [Frontend Architecture & Constraints](#10-frontend-architecture--constraints)
- [External API Access (Market Data, AI Models)](#11-external-api-access-market-data-ai-models)
- [Caching Strategy (Multi-layered)](#12-caching-strategy)
- [Error Handling & Observability Patterns](#13-error-handling--observability-patterns)
- [Security Guide: RLS, Secrets, Keys, Tokens](#14-security-guide-rls-secrets-keys-tokens)
- [TypeScript Standards & Style Rules](#15-typescript-standards--style-rules)
- [Testing Framework & Strategies](#16-testing-framework--strategies)
- [GOOD vs BAD Examples (Deep Library)](#17-good-vs-bad-examples-deep-library)
- [Checklist Library (Architecture, PR, Deployment)](#18-checklist-library-architecture-pr-deployment)
- [AI Assistant Operating Rules (Copilot, ChatGPT, Claude)](#19-ai-assistant-operating-rules-copilot-chatgpt-claude)
- [Appendix — ASCII Diagrams, Extensions, Migration Paths](#20-appendix--ascii-diagrams-extensions-migration-paths)


1. Introduction & Philosophy

This handbook defines the complete technical ruleset for this repository.
It exists to align:

Human developers

AI coding assistants

Automated processes

Documentation standards

The goals:

Consistency across the entire codebase

Security (especially RLS, auth, secrets)

Predictable architecture

Separation of concerns

High readability

Ease of onboarding

Zero ambiguity for AI assistants

This repo is intentionally engineered for a server-controlled data flow, meaning:

📌 All data flows through API routes.
📌 No client-side direct Supabase access.
📌 No client-side external API calls.
📌 Backend = multi-layered, typed, validated, logged.
📌 Zod = single source of truth for request/response models.

This handbook is the authoritative specification.


2. Core Architecture Overview

The application is a Next.js App Router project with:

Supabase as authoritative database

RLS enforcing per-user data access

Server-only backend layer in src/backend/modules

Admin-only privileged layer in src/backend/admin

External fetches (market data, AI models) through controlled backend code

Zod as the contract language

100% of client interactions passing through API routes

No direct DB access in client or route handlers

2.1 Architecture Layers
┌─────────────────────────────┐
│         Client UI           │   ← React components, hooks
└──────────────┬──────────────┘
               │ fetch('/api/*')
               ▼
┌─────────────────────────────┐
│      Next.js API Route      │   ← app/api/*/route.ts
└──────────────┬──────────────┘
               │ calls
               ▼
┌─────────────────────────────┐
│     Controller Layer         │   ← Validates input, shapes output
└──────────────┬──────────────┘
               │ calls
               ▼
┌─────────────────────────────┐
│      Service Layer           │   ← Business logic, orchestration
└──────────────┬──────────────┘
               │ calls
               ▼
┌─────────────────────────────┐
│     Repository Layer         │   ← Supabase DB access
└──────────────┬──────────────┘
               │ 
               ▼
┌─────────────────────────────┐
│         Supabase DB          │   ← RLS applied
└─────────────────────────────┘

2.2 Admin Subsystem
Admin Interface / Cron Jobs
             |
             v
    src/backend/admin/*
             |
    OPTIONAL Prisma (service role)
             |
       Supabase DB
 (bypasses RLS, admin-only)

3. Request Lifecycle — Full Path
User → UI → API Route → Controller → Service → Repository → Supabase
[React Component]
     |
     | fetch('/api/portfolio', { method: "GET" })
     |
[Next.js API Route]
     |
     | return portfolioController.get()
     |
[Controller]
     |
     | validate input with Zod
     |
[Service]
     |
     | business logic, transformations
     |
[Repository]
     |
     | supabase.from(...).select(...)
     |
    [Supabase Postgres]

Client never bypasses the server.

4. Project Directory Structure (Authoritative)
src/
  app/
    api/
      <domain>/
        route.ts                 # calls controller only
      admin/<task>/
        route.ts                 # admin only, privileged
    page.tsx
    layout.tsx

  backend/
    modules/
      <domain>/
        <entity>.controller.ts
        <entity>.service.ts
        <entity>.repository.ts

    admin/
      prisma/                    # optional admin ORM
      jobs/                      # CRON / scheduled tasks
      admin.service.ts
      admin.utils.ts

  lib/
    zod/                         # canonical schemas
    api/                         # external API wrappers
    ai/                          # AI utilities & prompts
    hooks/                       # frontend hooks
    utils/                       # general utilities
    cache/                       # caching helpers

  components/                    # UI components
  styles/

tests/                           # Jest tests
scripts/

.env.local


5. Backend Design (Core Patterns)

Backend code must always follow MVC-like layering:

5.1 Controller

Responsibilities:

Zod validation

HTTP-Response formatting

Mapping request → service

NEVER:

Perform database access

Contain business logic

5.2 Service

Responsibilities:

Computation

Aggregation

Orchestration

Combining data from multiple repositories

Determining workflows

NEVER:

Touch Supabase directly

Perform HTTP formatting

5.3 Repository

Responsibilities:

All database access

All Supabase queries

RLS-aware operations

Typed queries using Database types

NEVER:

Validate input

Perform business logic

Format HTTP responses

5.4 Example (Full Layer Flow)
stocks.controller.ts
stocks.service.ts
stocks.repository.ts


Route

export async function GET() {
  return getStocksController();
}


Controller

export async function getStocksController() {
  const stocks = await stocksService.getStocks();
  return NextResponse.json({ success: true, data: stocks });
}


Service

export async function getStocks() {
  return stocksRepo.fetchStocksForAuthenticatedUser();
}


Repository

export async function fetchStocksForAuthenticatedUser() {
  const supabase = createServerClient();
  return supabase.from('stocks').select('*');
}


6. Supabase Rules (The Source of Truth)
6.1 Supabase usage is server-only
Allowed

Repository layer

Admin layer

Forbidden

Client components

API route files directly

Services

UI hooks

6.2 Row Level Security (RLS)

RLS must always be ON for all user tables.

Service role access allowed only in:

/src/backend/admin/**

6.3 Supabase client setup (server-side only)
import { createClient } from '@supabase/supabase-js';

export function createServerSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}


7. Admin Layer — Prisma Allowed

Prisma is optional and used for:

✔ Cron jobs
✔ Analytics
✔ Cache rebuilds
✔ Admin dashboards
✔ RLS-bypassing operations

You may not use Prisma:

In user-facing API routes

In service/repository for the main app

7.1 Admin directory structure
src/backend/admin/
  prisma/
  jobs/
  admin.service.ts
  admin.utils.ts

7.2 Example Admin Job
// jobs/rebuildCache.ts
import { prisma } from '../prisma/client';

export async function rebuildCache() {
  const rows = await prisma.stockSnapshot.findMany();
  // compute, aggregate, update cache
}


8. API Route Architecture
8.1 Mandatory flow
API route → Controller → Service → Repository → Supabase

8.2 API Route Rules

Must be thin

Must call controller

Must not contain logic

Must not contain Supabase

Must not contain Zod schemas (controller handles that)

8.3 Example
// app/api/portfolio/route.ts
import { getPortfolio } from '@/backend/modules/portfolio/portfolio.controller';

export async function GET() {
  return getPortfolio();
}


9. Zod — Primary Contract Language

All schemas live in:

src/lib/zod/<domain>.ts

Zod schemas define:

request payloads

response shapes

type inference (z.infer)

Controller must validate inputs:
const parsed = schema.safeParse(body);
if (!parsed.success) return errorResponse(parsed.error);


10. Frontend Architecture & Constraints
❌ Frontend may NOT:

Call Supabase

Call external APIs

Access environment secrets

Perform business logic

Compute portfolio risk/metrics at scale

✔ Frontend MUST:

Call /api/* for all data

Use hooks inside src/lib/hooks

Use pure UI components

Use Suspense & React Server Components where appropriate

Use client components only when necessary


11. External API Access (Market Data, AI models)

Only backend code may call:

AlphaVantage

Polygon.io

Finnhub

FinancialModelingPrep

LLM APIs (Claude/GPT/Gemini)

External API Wrappers live in:
src/lib/api/<provider>.ts


12. Caching Strategy
12.1 Caching Layers

Static caching (Next.js fetch with revalidate)

In-memory caching (server)

Supabase cached tables

Admin-cron-cache rebuilds

Client-side ephemeral caching (never sensitive data)

12.2 Example: Fetch with Revalidate
await fetch(url, { next: { revalidate: 60 } });


13. Error Handling & Observability
13.1 Error Response Format
{ success: false, error: string, message?: string }

13.2 Logging

No secrets

No harmful PII

Use console.error on server only


14. Security Guide
❌ Forbidden

Embedding secrets in client

Service role keys anywhere outside admin

Returning raw Supabase errors

RLS disabled on user tables

✔ Required

Zod validation

Only API routes exposed

RLS checks on all repository methods


15. TypeScript Standards

strict: true

No any

Types from Zod

Absolute imports

Pure functions where possible


16. Testing Strategy

Unit tests: service & utils

Integration tests: API routes

Admin jobs: separate test environment


17. GOOD vs BAD Example Library (Extensive)
17.1 Data Access
❌ BAD — DB in API route
supabase.from('p').select('*');

✅ GOOD
return portfolioController.list();

17.2 Client Fetching
❌ BAD
fetch('https://api.polygon.io/...'); 

✅ GOOD
await fetch('/api/market/quote');

17.3 Business Logic Location
❌ BAD — logic in route
export async function GET() {
  return heavyCompute();
}

✅ GOOD
export async function GET() {
  return computeController.handle();
}


18. Checklist Library
PR Checklist

Architecture respected

Controller → service → repo flow

No client API calls

RLS enforced

Zod used

No inline DB queries in routes

Deployment Checklist

ENV vars present

RLS policies tested

Admin routes protected

Cron jobs configured


19. AI Assistant Operating Rules
AI MUST:

✔ Follow architecture strictly
✔ Place code in correct directories
✔ Use Zod schemas
✔ Use controller→service→repo pattern
✔ Provide file paths
✔ Provide short explanations
✔ Avoid secrets
✔ Suggest improvements when conflicts arise

AI MUST NOT:

❌ Generate client-side Supabase
❌ Generate external fetch in frontend
❌ Mix layers
❌ Return insecure examples
❌ Modify architecture unless asked


20. Appendix

Includes:

ASCII diagrams

Suggested file templates

Migration examples

Skeleton module generator
