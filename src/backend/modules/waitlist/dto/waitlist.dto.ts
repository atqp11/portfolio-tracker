/**
 * Waitlist DTOs - Request/Response Types & Validation
 *
 * Data Transfer Objects with Zod schemas for type-safe validation
 */

import { z } from 'zod';

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

/**
 * Query params schema for listing waitlist entries
 */
export const listWaitlistQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(50),
  notified: z.enum(['true', 'false', 'all']).optional().default('all'),
  search: z.string().optional(),
});

export type ListWaitlistQuery = z.infer<typeof listWaitlistQuerySchema>;

/**
 * Schema for deleting a waitlist entry
 */
export const deleteWaitlistSchema = z.object({
  id: z.string().uuid('Invalid waitlist entry ID format'),
});

export type DeleteWaitlistRequest = z.infer<typeof deleteWaitlistSchema>;

/**
 * Schema for updating waitlist entry notification status
 */
export const updateWaitlistStatusSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'At least one ID is required'),
  notified: z.boolean(),
});

export type UpdateWaitlistStatusRequest = z.infer<typeof updateWaitlistStatusSchema>;

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Single waitlist entry response
 */
export interface WaitlistEntryDto {
  id: string;
  email: string;
  name: string | null;
  notified: boolean;
  createdAt: string;
}

/**
 * Pagination metadata
 */
export interface PaginationDto {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * List waitlist response
 */
export interface ListWaitlistResponseDto {
  entries: WaitlistEntryDto[];
  pagination: PaginationDto;
}

/**
 * Delete waitlist response
 */
export interface DeleteWaitlistResponseDto {
  message: string;
  deletedEmail: string;
}

/**
 * Update waitlist status response
 */
export interface UpdateWaitlistStatusResponseDto {
  message: string;
  updatedCount: number;
}
