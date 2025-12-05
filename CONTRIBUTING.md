# Contributing to Live Portfolio Tracker

Thanks for wanting to contribute! Below are a few quick notes to help you get started and keep contributions consistent.

## Testing organization (Jest)
- Tests follow the common Jest convention: place test files under a `__tests__` directory next to the code they exercise.
- Examples:
  - `api/auth/__tests__/auth.test.ts`
  - `src/lib/__tests__/calculator.spec.ts`
  - `src/__tests__/helpers/test-utils.ts`

## Shared test helpers
- Shared helpers and setup live under `src/__tests__`. This repo maps `@test/*` to `src/__tests__/*` in `jest.config.cjs` so tests can use imports like:

```ts
import { createMockRequest } from '@test/helpers/test-utils';
```

## Running tests locally
1. Install dependencies:

```powershell
npm install
```

2. Run the test suite:

```powershell
npm test
```

If you add or move tests, keep them next to the implementation in `__tests__` folders and make sure imports remain correct.

Thanks — contributions are highly appreciated! If you're unsure about where to add a test, ask in a pull request and we'll help place it in the right module.