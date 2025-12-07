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
