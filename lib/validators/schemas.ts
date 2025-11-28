/**
 * Zod Validation Schemas
 *
 * Centralized validation schemas using Zod for type-safe validation.
 * Replaces custom validation rules with industry-standard Zod schemas.
 */

import { z } from 'zod';

/**
 * Common field validators
 */
export const commonSchemas = {
  // ID validators
  uuid: z.string().uuid('Invalid UUID format'),
  id: z.string().min(1, 'ID is required'),

  // String validators
  email: z.string().email('Invalid email address'),
  url: z.string().url('Invalid URL format'),
  nonEmptyString: z.string().min(1, 'This field cannot be empty'),

  // Number validators
  positiveNumber: z.number().positive('Must be a positive number'),
  nonNegativeNumber: z.number().nonnegative('Must be zero or positive'),
  positiveInteger: z.number().int().positive('Must be a positive integer'),

  // Date validators
  dateString: z.string().datetime('Invalid date format'),
  date: z.coerce.date(),

  // Boolean validators
  boolean: z.boolean(),
};

/**
 * Ticker symbol validator
 */
export const tickerSchema = z.string()
  .min(1, 'Ticker is required')
  .max(10, 'Ticker must be 10 characters or less')
  .regex(/^[A-Z0-9.]+$/, 'Ticker must contain only uppercase letters, numbers, and periods')
  .transform(val => val.toUpperCase());

/**
 * Portfolio type validator
 */
export const portfolioTypeSchema = z.enum([
  'Investment',
  'Trading',
  'Growth',
  'Dividend',
  'Value',
  'Index',
], { message: 'Invalid portfolio type' });

/**
 * Tier name validator
 */
export const tierNameSchema = z.enum(['free', 'basic', 'premium'], {
  message: 'Invalid tier'
});

/**
 * Monetary amount validator
 */
export const monetaryAmountSchema = z.number()
  .nonnegative('Amount must be zero or positive')
  .finite('Amount must be a finite number');

/**
 * Share quantity validator
 */
export const shareQuantitySchema = z.number()
  .positive('Share quantity must be positive')
  .finite('Share quantity must be a finite number')
  .min(0.000001, 'Share quantity too small');

/**
 * Percentage validator (0-100)
 */
export const percentageSchema = z.number()
  .min(0, 'Percentage must be at least 0')
  .max(100, 'Percentage must be at most 100');

/**
 * Pagination schemas
 */
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

/**
 * Profile schemas
 */
export const createProfileSchema = z.object({
  id: commonSchemas.id,
  email: commonSchemas.email,
  name: z.string().min(1).max(255).optional(),
  tier: tierNameSchema.default('free'),
});

export type CreateProfileInput = z.infer<typeof createProfileSchema>;

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  tier: tierNameSchema.optional(),
  is_admin: z.boolean().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/**
 * Portfolio schemas
 */
export const createPortfolioSchema = z.object({
  name: z.string().min(1, 'Portfolio name is required').max(255),
  type: z.string().min(1, 'Portfolio type is required').max(255),
  initialValue: monetaryAmountSchema,
  targetValue: monetaryAmountSchema.optional(),
  borrowedAmount: monetaryAmountSchema.default(0),
  marginCallLevel: percentageSchema.default(30),
});

export type CreatePortfolioInput = z.infer<typeof createPortfolioSchema>;

export const updatePortfolioSchema = createPortfolioSchema.partial();

export type UpdatePortfolioInput = z.infer<typeof updatePortfolioSchema>;

/**
 * Stock schemas
 */
export const createStockSchema = z.object({
  portfolioId: commonSchemas.uuid,
  symbol: tickerSchema,
  name: z.string().min(1).max(255),
  shares: shareQuantitySchema,
  avgPrice: monetaryAmountSchema,
  currentPrice: monetaryAmountSchema.nullable().optional(),
});

export type CreateStockInput = z.infer<typeof createStockSchema>;

export const updateStockSchema = createStockSchema.partial().omit({ portfolioId: true });

export type UpdateStockInput = z.infer<typeof updateStockSchema>;

/**
 * Investment Thesis schemas
 */
export const createThesisSchema = z.object({
  portfolio_id: commonSchemas.uuid,
  ticker: tickerSchema,
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().min(1, 'Description is required'),
  rationale: z.string().min(1, 'Rationale is required'),
  bear_case: z.string().nullable().optional(),
  risks: z.array(z.string()).default([]),
  key_metrics: z.record(z.string(), z.any()).optional(),
  stop_loss_rules: z.record(z.string(), z.any()).optional(),
  exit_criteria: z.record(z.string(), z.any()).optional(),
  thesis_health_score: z.number().min(0).max(100).default(50),
  urgency: z.enum(['green', 'yellow', 'red']).default('green'),
  status: z.string().default('active'),
});

export type CreateThesisInput = z.infer<typeof createThesisSchema>;

export const updateThesisSchema = createThesisSchema.partial().omit({ portfolio_id: true });

export type UpdateThesisInput = z.infer<typeof updateThesisSchema>;



// We need to include 'id' for the update thesis body schema since it's in the body

export const updateThesisBodySchema = updateThesisSchema.extend({

    id: commonSchemas.uuid,

});

export type UpdateThesisBodyInput = z.infer<typeof updateThesisBodySchema>;





/**

 * Daily Checklist schemas

 */

export const createDailyChecklistSchema = z.object({
  portfolioId: commonSchemas.uuid,
  date: commonSchemas.date.optional(),
  totalTasks: z.number().int().nonnegative().default(0),
  completedTasks: z.number().int().nonnegative().default(0),
  completionPercentage: percentageSchema.default(0),
  currentStreak: z.number().int().nonnegative().default(0),
  longestStreak: z.number().int().nonnegative().default(0),
});

export type CreateDailyChecklistInput = z.infer<typeof createDailyChecklistSchema>;

export const updateDailyChecklistSchema = createDailyChecklistSchema.partial().omit({ portfolioId: true });

export type UpdateDailyChecklistInput = z.infer<typeof updateDailyChecklistSchema>;

// We need to include 'id' for the update checklist body schema since it's in the body
export const updateChecklistBodySchema = updateDailyChecklistSchema.extend({
    id: commonSchemas.uuid,
});
export type UpdateChecklistBodyInput = z.infer<typeof updateChecklistBodySchema>;


/**
 * Checklist Task schemas
 */
export const createTaskSchema = z.object({
  checklistId: commonSchemas.uuid.nullable().optional(),
  portfolioId: commonSchemas.uuid,
  task: z.string().min(1, 'Task is required').max(500),
  category: z.string().default('general'),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'once']).default('daily'),
  urgency: z.number().int().min(1).max(5).default(1),
  completed: z.boolean().default(false),
  completedAt: z.string().datetime().nullable().optional(),
  condition: z.string().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = createTaskSchema.partial().omit({ portfolioId: true });

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

/**
 * Usage Action schema
 */
export const usageActionSchema = z.enum(['chatQuery', 'portfolioAnalysis', 'secFiling']);

export type UsageActionInput = z.infer<typeof usageActionSchema>;

/**
 * Query filter schemas
 */
export const filterOperatorSchema = z.enum([
  'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
  'like', 'ilike', 'in', 'is', 'contains', 'containedBy'
]);

export const queryFilterSchema = z.object({
  field: z.string(),
  operator: filterOperatorSchema,
  value: z.any(),
});

export const querySortSchema = z.object({
  field: z.string(),
  ascending: z.boolean().default(true),
});

/**
 * Helper function to validate request body
 */
export function validateRequestBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(body);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, error: result.error };
}

/**
 * Helper function to format Zod errors for API responses
 */
export function formatZodError(error: z.ZodError): {
  message: string;
  errors: Array<{ field: string; message: string }>;
} {
  const issues = error.issues || (error as any).errors || [];
  return {
    message: 'Validation failed',
    errors: issues.map((err: any) => ({
      field: Array.isArray(err.path) ? err.path.join('.') : String(err.path || ''),
      message: err.message || 'Validation error',
    })),
  };
}

/**
 * Middleware helper to validate and parse request body
 */
export async function parseRequestBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string; details: any }> {
  try {
    const body = await request.json();
    const result = validateRequestBody(schema, body);

    if (!result.success) {
      return {
        success: false,
        error: 'Validation failed',
        details: formatZodError(result.error),
      };
    }

    return { success: true, data: result.data };
  } catch (error) {
    return {
      success: false,
      error: 'Invalid JSON in request body',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
