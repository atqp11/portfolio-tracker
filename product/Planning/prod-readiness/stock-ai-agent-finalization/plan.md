# Stock AI Agent Finalization Plan

**Created:** December 5, 2025  
**Status:** Planning  
**Goal:** Pre-production readiness for Stock AI Agent features

---

## Objective

Complete and verify all Stock AI Agent features for pre-production, with a focus on checklist, thesis validation, advanced metrics, and robust reliability/testing.

---

## Current State (as of Phase 3)

### AI Agent Architecture
- **Layered MVC pattern**: Route → Controller → Service → AI Provider (confidence-router)
- **Multi-model routing**: Groq (Tier 1) → Gemini Flash (Tier 2) → Gemini Pro (Tier 3)
- **Cost tracking**: Telemetry, per-query cost logging
- **Caching**: Chat cache service, tier-based TTL
- **Comprehensive tests**: 40+ unit tests, 10+ integration tests

### Key Files
- `src/backend/modules/ai/ai.controller.ts` — AI Controller
- `src/backend/modules/ai/service/chat.service.ts` — Chat Service (business logic)
- `src/backend/modules/ai/service/chat-cache.service.ts` — Caching logic
- `src/lib/ai/confidence-router.ts` — Multi-model routing
- `src/lib/ai/router.ts` — AI Router
- `app/api/ai/chat/route.ts` — Chat API route (thin)
- `app/api/ai/generate/route.ts` — Generate API route
- `app/api/ai/portfolio-change/route.ts` — Portfolio change API route
- `components/StonksAI/` — AI Chat UI components

### Feature Roadmap Reference (FEATURE_ROADMAP.md, Phase 4)
- **4.1 Multi-Model AI Architecture** (done)
- **4.2 Conversational & Context-Aware AI**
  - Conversation management (history, per user/portfolio)
  - Context integration (portfolio, market, thesis)
  - Interactive chat interface (streaming, regenerate, autocomplete)
- **4.3 Personal & Emotional Support**
  - Emotional intelligence (system prompts)
  - Behavioral nudges (detect impulsive behavior)
  - Personalization (risk tolerance, style, horizon)
- **4.4 Portfolio Optimization & Risk Profiling**
  - AI-powered optimization suggestions
  - Risk profiling (concentration, volatility, leverage, correlation)
  - AI risk advisor integration
- **4.5 Interactive Scenarios & "What-If" Analysis**
  - Scenario builder UI
  - AI-powered "what-if" chat
  - Pre-built scenario templates

---

## Steps

### 1. Feature Audit
- [ ] Review PRD and Feature Roadmap for all required Stock AI Agent features.
- [ ] Cross-reference with codebase (`src/backend/modules/ai/`, `components/StonksAI/`).
- [ ] List and prioritize missing or incomplete features:
  - [ ] Conversation management (history, DB storage)
  - [ ] Context integration (portfolio, market, thesis)
  - [ ] Emotional intelligence (system prompts)
  - [ ] Behavioral nudges (impulsive behavior detection)
  - [ ] Risk profiling integration
  - [ ] Scenario builder and "what-if" analysis

### 2. Implementation
- [ ] Complete missing features per the roadmap:
  - [ ] **Conversation management:** Store history in DB (per user/portfolio), manage context window.
  - [ ] **Context integration:** Auto-include portfolio, market data, thesis in prompts.
  - [ ] **Emotional support:** Update system prompts for empathy, behavioral nudges.
  - [ ] **Risk profiling:** Integrate risk score into AI responses.
  - [ ] **Scenario builder:** UI and backend for custom/pre-built scenarios.
- [ ] Ensure all features use latest data providers and orchestrator logic.

### 3. Testing
- [ ] Write/expand unit and integration tests for all agent features.
- [ ] Add tests for edge cases, user errors, and data anomalies.
- [ ] Simulate real-world usage scenarios (e.g., high volatility, missing data).
- [ ] Reference test files:
  - `src/backend/modules/ai/__tests__/chat.service.test.ts`
  - `src/backend/modules/ai/__tests__/chat-cache.service.test.ts`
  - `src/backend/modules/ai/__tests__/ai-chat.integration.test.ts`
  - `src/backend/modules/ai/__tests__/concurrent-requests.test.ts`
- [ ] Ensure all tests pass (`npm test`).

### 4. Error Handling
- [ ] Ensure all agent logic gracefully handles missing/invalid data and provider failures.
- [ ] Add user-facing error messages and logging for all failure modes.
- [ ] Validate null/undefined handling in all AI service methods.

### 5. Reliability Verification
- [ ] Monitor agent performance, response times, and error rates.
- [ ] Perform load and stress testing (see `load-tests/` folder).
- [ ] Review logs and user feedback for issues.
- [ ] Validate cache TTL and conversation history management.

### 6. Acceptance Criteria
- [ ] All features complete and functional in pre-prod.
- [ ] All tests passing, including edge/failure cases.
- [ ] No unhandled errors in logs.
- [ ] Documentation and user guides updated.
- [ ] AI response time <3s average (per PRD).
- [ ] Build and test suite green.

---

---

## MVC/Layer Separation Pattern (Mandatory)

All new or modified code MUST follow the strict 5-layer architecture:

```
API Route → Middleware Stack → Controller Class → Service Layer → DAO Layer
   ↓            ↓                    ↓                 ↓            ↓
  HTTP      Auth/Quota/         HTTP Logic       Business      Database
  Entry     Validation                           Logic         Access
```

### Layer Responsibilities

| Layer       | Location                                              | Allowed                                      | Forbidden                                  |
|-------------|-------------------------------------------------------|----------------------------------------------|--------------------------------------------|
| **Route**   | `app/api/*`                                           | Receive request, delegate to controller      | Business logic, validation, DB access      |
| **Controller** | `src/backend/modules/[feature]/[feature].controller.ts` | Extract, call service, format response       | Business logic, validation, DB access      |
| **Service** | `src/backend/modules/[feature]/service/*.service.ts`  | Business rules, orchestration, external APIs | HTTP concerns, direct DB queries           |
| **DAO**     | `src/backend/modules/[feature]/dao/*.dao.ts`          | DB queries, ORM, data mapping                | Business logic                             |
| **Middleware** | `src/backend/common/middleware/`                   | Auth, validation, quota, error handling      | Business logic                             |

### Example: AI Chat Route (Reference)

- **Route:** `app/api/ai/chat/route.ts` — thin wrapper (~35 lines), calls controller
- **Controller:** `src/backend/modules/ai/ai.controller.ts`
- **Service:** `src/backend/modules/ai/service/chat.service.ts`
- **Cache Service:** `src/backend/modules/ai/service/chat-cache.service.ts`

**Anti-patterns:**
- ❌ Business logic in route or controller
- ❌ Direct DB/AI access in route/controller
- ❌ Validation in controller (use middleware)

---

## References
- PRD: `product/PRD/Portfolio_Platform_PRD_v1.0.md`
- Feature Roadmap: `product/Planning/roadmap/FEATURE_ROADMAP.md` (Phase 4)
- AI Module README: `src/backend/modules/ai/README.md`
- CLAUDE.md: `CLAUDE.md` (coding guidelines)
- AI Coding Agent Guide: `docs/0_AI_Coding_Agent_Guide.md` (layer separation, MVC pattern)

---

## RSC/Server Actions Refactoring (Pre-prod Scope)

For all paths touched in this plan, ensure:
- AI/Chat pages and components under `app/(protected)/` and `components/StonksAI/` are **Server Components** for data fetching where possible.
- Client Components are used only for interactivity (chat input, streaming UI, modals, etc.).
- Where mutations are needed (e.g., saving conversation, user preferences), prefer **Server Actions** over API routes.
- All Server Actions include Zod validation and use `revalidatePath` for cache invalidation.

### Pages/Routes to Migrate (Quick Reference)

| Page/Route                                      | Current           | Target (RSC/Server Action)         | Notes                                  |
|-------------------------------------------------|-------------------|------------------------------------|----------------------------------------|
| `app/(protected)/dashboard/page.tsx`            | Client Component  | Server Component + Client interactivity | AI widget data fetched in RSC          |
| `app/(protected)/thesis/page.tsx`               | Client Component  | Server Component + Client interactivity | Thesis data fetched in RSC             |
| `app/(protected)/checklist/page.tsx`            | Client Component  | Server Component + Client interactivity | Checklist data fetched in RSC          |
| `components/StonksAI/StonksAI.tsx`              | Client Component  | Client Component (streaming, chat) | Keep as CC for chat interactivity      |
| `components/StonksAI/QuotaBanner.tsx`           | Client Component  | Server Component (if no interactivity) | Or pass data from parent RSC           |
| `components/ThesisCard.tsx`                     | Client Component  | Server Component (if no interactivity) | Or pass data from parent RSC           |
| `components/ChecklistTaskCard.tsx`              | Client Component  | Server Component (if no interactivity) | Or pass data from parent RSC           |

**Post-MVP:** Full RSC/Server Actions refactoring is tracked in `product/Planning/post-mvp/RSC_SERVER_ACTIONS_REFACTOR.md`.

---

## Next Steps
1. Run all tests and build to establish baseline.
2. Audit each AI feature for completeness.
3. Implement missing features per roadmap priority.
4. Add/expand tests for all new and existing features.
5. Fix any error handling or reliability issues.
6. Refactor touched pages/components to RSC/Server Actions where feasible.
7. Document all changes and update this plan as complete.
