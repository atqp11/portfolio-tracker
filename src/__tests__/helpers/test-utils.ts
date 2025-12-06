/**
 * Test Utilities
 *
 * Common utilities and helpers for testing.
 */

import { NextRequest } from 'next/server';

/**
 * Create a mock NextRequest for testing
 */
export function createMockRequest(options: {
  method?: string;
  url?: string;
  body?: any;
  headers?: Record<string, string>;
  searchParams?: Record<string, string>;
} = {}): NextRequest {
  const {
    method = 'GET',
    url = 'http://localhost:3000/api/test',
    body,
    headers = {},
    searchParams = {},
  } = options;

  // Build URL with search params
  const urlObj = new URL(url);
  Object.entries(searchParams).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value);
  });

  const requestInit: any = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
    requestInit.body = JSON.stringify(body);
  }

  return new NextRequest(urlObj.toString(), requestInit);
}

/**
 * Extract JSON from NextResponse
 */
export async function extractJSON(response: Response): Promise<any> {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/**
 * Mock user session for testing
 */
export function mockUserSession(user: {
  id: string;
  email: string;
  tier?: 'free' | 'basic' | 'premium';
  is_admin?: boolean;
}) {
  const profile = {
    id: user.id,
    email: user.email,
    name: null,
    tier: user.tier || 'free',
    is_admin: user.is_admin || false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return {
    user: {
      id: user.id,
      email: user.email,
      aud: 'authenticated',
      role: 'authenticated',
      created_at: new Date().toISOString(),
    },
    profile,
  };
}

/**
 * Generate test UUID
 */
export function generateTestId(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error('Timeout waiting for condition');
}

/**
 * Mock Supabase client for testing
 */
export function createMockSupabaseClient() {
  return {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
  };
}

/**
 * Mock Prisma client for testing
 */
export function createMockPrismaClient() {
  const mockModel = {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(null),
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({}),
    createMany: jest.fn().mockResolvedValue({ count: 0 }),
    update: jest.fn().mockResolvedValue({}),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    delete: jest.fn().mockResolvedValue({}),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    count: jest.fn().mockResolvedValue(0),
  };

  return {
    user: mockModel,
    portfolio: mockModel,
    stock: mockModel,
    investmentThesis: mockModel,
    dailyChecklist: mockModel,
    checklistTask: mockModel,
    usageTracking: mockModel,
    $transaction: jest.fn((callback) => callback(mockModel)),
  };
}

// ============================================================================
// TYPED MOCK PATTERNS
// ============================================================================

/**
 * Typed Mock Pattern Documentation
 * 
 * When creating Jest mocks, always use explicit type signatures to avoid `any`.
 * This ensures type safety and catches errors at compile time.
 * 
 * PATTERN 1: Simple function mock with known signature
 * ✅ GOOD:
 * ```typescript
 * const mockGetUser = jest.fn() as jest.MockedFunction<
 *   (userId: string) => Promise<User | null>
 * >;
 * ```
 * 
 * ❌ BAD:
 * ```typescript
 * const mockGetUser = jest.fn() as any;
 * const mockGetUser = jest.fn() as jest.MockedFunction<(...args: unknown[]) => any>;
 * ```
 * 
 * PATTERN 2: Module mock with forwarding
 * ✅ GOOD:
 * ```typescript
 * const mockGetUser = jest.fn() as jest.MockedFunction<
 *   (userId: string) => Promise<User | null>
 * >;
 * 
 * jest.mock('@lib/user', () => ({
 *   getUser: (userId: string) => mockGetUser(userId),
 * }));
 * ```
 * 
 * PATTERN 3: Complex object mocks (like Stripe)
 * Use explicit parameter types instead of unknown[] spreads:
 * ✅ GOOD:
 * ```typescript
 * const mockCreate = jest.fn() as jest.MockedFunction<
 *   (params: Stripe.CustomerCreateParams) => Promise<Stripe.Customer>
 * >;
 * ```
 */

/**
 * Create a typed mock function with explicit signature
 * 
 * @example
 * ```typescript
 * // For a function: (userId: string, tier: string) => Promise<Profile>
 * const mockFn = createTypedMock<
 *   (userId: string, tier: string) => Promise<Profile>
 * >();
 * ```
 */
export function createTypedMock<T extends (...args: any[]) => any>(): jest.MockedFunction<T> {
  return jest.fn() as unknown as jest.MockedFunction<T>;
}

/**
 * Create a mock Profile object with all required fields
 * Useful for testing authentication and user-related functionality
 */
export function createMockProfile(overrides?: Partial<{
  id: string;
  email: string;
  name: string | null;
  tier: 'free' | 'basic' | 'premium';
  is_admin: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  created_at: string;
  updated_at: string;
}>): any {
  const now = new Date().toISOString();
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    name: null,
    tier: 'free' as const,
    is_admin: false,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    subscription_status: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}
