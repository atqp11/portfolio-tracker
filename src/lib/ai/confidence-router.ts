/**
 * Confidence-Based AI Router
 *
 * Implements smart routing logic from AI_MODEL_STRATEGY.md:
 * - Primary: Gemini Flash (fast, low-cost chat)
 * - Escalation: Gemini Pro (high-quality, low-confidence cases)
 * - Fallback: Groq (bulk processing, fallback for chat)
 *
 * Decision flow:
 * 1. Try primary model (Gemini Flash)
 * 2. If confidence ≥0.85 → Accept and cache
 * 3. If 0.6 ≤ confidence <0.85 → Escalate to Gemini Pro
 * 4. If confidence <0.6 → Mark for review, try Gemini Pro
 */

import { generateChatResponse, type GeminiModel, type GeminiResponse } from './gemini';
import { generateText as groqGenerateText, type GroqResponse } from './groq';

export interface RouterContext {
  userMessage: string;
  ragContext?: string;
  portfolio?: {
    symbols: string[];
    totalValue: number;
  };
  preferModel?: 'gemini' | 'groq';
  maxRetries?: number;
}

export interface RouterResponse {
  text: string;
  confidence: number;
  model: string;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
  latencyMs: number;
  escalated: boolean;
  sources?: string[];
  cost: number;
}

export interface ConfidenceThresholds {
  accept: number; // ≥0.85 - Accept and cache
  escalate: number; // ≥0.60 - Escalate to higher model
  review: number; // <0.60 - Flag for manual review
}

const DEFAULT_THRESHOLDS: ConfidenceThresholds = {
  accept: 0.85,
  escalate: 0.60,
  review: 0.60,
};

/**
 * Route query with confidence-based escalation
 * Returns best available answer with metadata
 */
export async function routeQueryWithConfidence(
  context: RouterContext,
  thresholds: ConfidenceThresholds = DEFAULT_THRESHOLDS
): Promise<RouterResponse> {
  const { userMessage, ragContext = '', portfolio, preferModel, maxRetries = 2 } = context;

  let retries = 0;
  let currentModel: GeminiModel = 'gemini-2.0-flash-exp';
  let escalated = false;

  // Build full context
  const fullContext = buildContext(ragContext, portfolio);

  // Attempt 1: Primary model (Gemini Flash or Groq if preferred)
  if (preferModel === 'groq') {
    return await routeToGroq(userMessage, fullContext);
  }

  let response = await generateChatResponse(userMessage, fullContext, {
    model: currentModel,
    temperature: 0.3,
  });

  console.log(
    `📊 Router: ${currentModel} returned confidence ${response.confidence.toFixed(2)}`
  );

  // Check confidence and escalate if needed
  while (response.confidence < thresholds.accept && retries < maxRetries) {
    retries++;

    if (response.confidence >= thresholds.escalate) {
      // Escalate to Gemini Pro (higher quality)
      console.log(
        `⬆️ Router: Escalating to Gemini Pro (confidence ${response.confidence.toFixed(2)} < ${thresholds.accept})`
      );
      currentModel = 'gemini-1.5-pro';
      escalated = true;

      response = await generateChatResponse(userMessage, fullContext, {
        model: currentModel,
        temperature: 0.0, // Deterministic for high-quality response
      });

      console.log(
        `📊 Router: Gemini Pro returned confidence ${response.confidence.toFixed(2)}`
      );
    } else {
      // Low confidence (<0.60) - Flag for review and try Pro
      console.warn(
        `⚠️ Router: Low confidence ${response.confidence.toFixed(2)} < ${thresholds.review}. Flagging for review.`
      );
      currentModel = 'gemini-1.5-pro';
      escalated = true;

      response = await generateChatResponse(userMessage, fullContext, {
        model: currentModel,
        temperature: 0.0,
      });

      console.log(
        `📊 Router: Gemini Pro (review) returned confidence ${response.confidence.toFixed(2)}`
      );

      // If still low, break and return with warning
      if (response.confidence < thresholds.review) {
        console.error(
          `❌ Router: Still low confidence after Pro. Returning with review flag.`
        );
        break;
      }
    }
  }

  // Calculate cost
  const cost = calculateResponseCost(response, currentModel);

  return {
    text: response.text,
    confidence: response.confidence,
    model: currentModel,
    tokensUsed: response.tokensUsed,
    latencyMs: response.latencyMs,
    escalated,
    sources: response.sources,
    cost,
  };
}

/**
 * Route to Groq for bulk processing tasks
 * Used for filing summarization, news processing, etc.
 */
async function routeToGroq(
  prompt: string,
  systemPrompt: string = 'You are a financial analyst assistant. Provide concise, accurate summaries.'
): Promise<RouterResponse> {
  const response: GroqResponse = await groqGenerateText(prompt, systemPrompt, {
    temperature: 0.0,
    maxTokens: 2048,
  });

  // Groq responses are assumed high confidence for batch tasks (deterministic)
  const confidence = 0.95;

  return {
    text: response.text,
    confidence,
    model: response.model,
    tokensUsed: response.tokensUsed,
    latencyMs: response.latencyMs,
    escalated: false,
    cost: calculateGroqCost(response),
  };
}

/**
 * Build full context for RAG prompt
 */
function buildContext(ragContext: string, portfolio?: RouterContext['portfolio']): string {
  let context = '';

  if (portfolio) {
    context += `## Portfolio Context
- Holdings: ${portfolio.symbols.join(', ')}
- Total Value: $${portfolio.totalValue.toLocaleString()}

`;
  }

  if (ragContext) {
    context += `## Retrieved Evidence
${ragContext}

`;
  }

  return context;
}

/**
 * Calculate cost for Gemini response
 */
function calculateResponseCost(response: GeminiResponse, model: GeminiModel): number {
  const pricing: Record<GeminiModel, { input: number; output: number }> = {
    'gemini-2.0-flash-exp': { input: 0.075, output: 0.30 },
    'gemini-1.5-flash': { input: 0.075, output: 0.30 },
    'gemini-1.5-pro': { input: 1.25, output: 5.0 },
  };

  const modelPricing = pricing[model] || pricing['gemini-2.0-flash-exp'];

  const inputCost = (response.tokensUsed.input / 1_000_000) * modelPricing.input;
  const outputCost = (response.tokensUsed.output / 1_000_000) * modelPricing.output;

  return inputCost + outputCost;
}

/**
 * Calculate cost for Groq response
 * Pricing: $0.10 input, $0.10 output per 1M tokens
 */
function calculateGroqCost(response: GroqResponse): number {
  const INPUT_COST_PER_1M = 0.10;
  const OUTPUT_COST_PER_1M = 0.10;

  const inputCost = (response.tokensUsed.input / 1_000_000) * INPUT_COST_PER_1M;
  const outputCost = (response.tokensUsed.output / 1_000_000) * OUTPUT_COST_PER_1M;

  return inputCost + outputCost;
}

/**
 * Determine if query is suitable for batch processing (Groq)
 * vs interactive chat (Gemini)
 */
export function isBatchQuery(query: string): boolean {
  const batchKeywords = [
    'summarize',
    'filing',
    '10-k',
    '10-q',
    '8-k',
    'news digest',
    'batch',
    'sentiment analysis',
  ];

  const lowerQuery = query.toLowerCase();
  return batchKeywords.some((keyword) => lowerQuery.includes(keyword));
}

export default {
  routeQueryWithConfidence,
  isBatchQuery,
};
