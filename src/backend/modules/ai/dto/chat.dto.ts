/**
 * AI Chat DTOs
 * 
 * Data Transfer Objects for AI chat requests and responses.
 * These define the public API contract at the application boundary.
 */

import { z } from 'zod';

/**
 * Chat Request DTO
 */
export const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message is required').max(5000, 'Message too long'),
  portfolio: z.object({
    symbols: z.array(z.string()),
    totalValue: z.number(),
  }).optional(),
  portfolioId: z.string().uuid().optional(),
  bypassCache: z.boolean().optional().default(false),
  ragContext: z.string().optional().default(''),
});

export type ChatRequestDto = z.infer<typeof chatRequestSchema>;

/**
 * Chat Response DTO
 */
export const chatResponseSchema = z.object({
  text: z.string(),
  confidence: z.number(),
  model: z.string(),
  sources: z.array(z.string()).optional(),
  tokensUsed: z.object({
    input: z.number(),
    output: z.number(),
    total: z.number(),
  }).optional(),
  latencyMs: z.number().optional(),
  escalated: z.boolean().optional(),
  cost: z.number().optional(),
  cached: z.boolean(),
  cacheAge: z.number().optional(),
});

export type ChatResponseDto = z.infer<typeof chatResponseSchema>;

/**
 * Chat Stats Response DTO
 */
export const chatStatsResponseSchema = z.object({
  stats: z.any(), // Telemetry stats structure
  cacheSize: z.number(),
});

export type ChatStatsResponseDto = z.infer<typeof chatStatsResponseSchema>;

/**
 * Internal Chat Cache Entry (not exposed to API)
 */
export interface ChatCacheEntry {
  response: string;
  confidence: number;
  model: string;
  sources: string[];
  timestamp: number;
}

/**
 * Router Context (internal, passed to confidence router)
 */
export interface RouterContextInternal {
  userMessage: string;
  ragContext: string;
  portfolio?: {
    symbols: string[];
    totalValue: number;
  };
}
