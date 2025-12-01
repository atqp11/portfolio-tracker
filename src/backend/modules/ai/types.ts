/**
 * AI Module Types
 * 
 * Shared types and interfaces for the AI module
 */

export * from '@backend/modules/ai/dto/chat.dto';

/**
 * AI Provider Types
 */
export type AIProvider = 'gemini' | 'groq' | 'openai';

/**
 * AI Model Selection Strategy
 */
export type ModelStrategy = 'fast' | 'balanced' | 'quality';

/**
 * Confidence Levels
 */
export interface ConfidenceLevel {
  value: number;
  label: 'high' | 'medium' | 'low';
}

/**
 * AI Task Types
 */
export type AITaskType = 
  | 'chat'
  | 'summarization'
  | 'analysis'
  | 'filing-extraction'
  | 'sentiment';
