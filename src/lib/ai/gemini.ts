/**
 * Google Gemini AI Service
 *
 * Primary model for investor chat and interactive queries:
 * - RAG-based chat Q&A
 * - Portfolio-aware insights
 * - Emotional support conversations
 * - Context-heavy questions requiring evidence
 *
 * Uses Gemini Flash for low latency, Gemini Pro for high-quality escalations.
 * Quality: 9.0/10 for conversational AI
 * Latency: 500-800ms (Flash), 1-2s (Pro)
 * Cost: $0.075 input, $0.30 output per 1M tokens (Flash)
 */

import { GoogleGenAI } from '@google/genai';

// Initialize Gemini client
const genai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.AI_API_KEY || '',
});

export type GeminiModel = 'gemini-2.5-flash' | 'gemini-2.0-flash' | 'gemini-1.5-flash-latest';

export interface GeminiOptions {
  temperature?: number;
  maxTokens?: number;
  model?: GeminiModel;
  systemInstruction?: string;
}

export interface GeminiResponse {
  text: string;
  confidence: number;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
  model: string;
  latencyMs: number;
  sources?: string[];
}

/**
 * Generate chat response using Gemini
 * Optimized for investor Q&A
 */
export async function generateChatResponse(
  userMessage: string,
  context: string = '',
  options: GeminiOptions = {}
): Promise<GeminiResponse> {
  const startTime = Date.now();

  const {
    temperature = 0.3, // Slight creativity for chat
    maxTokens = 2048,
    model = 'gemini-2.0-flash-exp',
    systemInstruction = DEFAULT_SYSTEM_INSTRUCTION,
  } = options;

  const prompt = context
    ? `## Context\n${context}\n\n## User Question\n${userMessage}`
    : userMessage;

  try {
    const response = await genai.models.generateContent({
      model,
      contents: prompt,
      config: {
        temperature,
        maxOutputTokens: maxTokens,
      },
      systemInstruction,
    });

    const responseText = response.text || '';
    const latencyMs = Date.now() - startTime;

    // Estimate confidence based on response characteristics
    const confidence = estimateConfidence(responseText, context);

    // Extract cited sources (chunk IDs, filing references)
    const sources = extractSources(responseText);

    return {
      text: responseText,
      confidence,
      tokensUsed: {
        input: estimateTokens(prompt),
        output: estimateTokens(responseText),
        total: estimateTokens(prompt) + estimateTokens(responseText),
      },
      model,
      latencyMs,
      sources,
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error(
      `Gemini generation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate simple text response using Gemini
 * For basic text generation tasks like query generation
 */
export async function generateText(
  prompt: string,
  options: GeminiOptions = {}
): Promise<string> {
  const {
    temperature = 0.3,
    maxTokens = 200,
    model = 'gemini-2.0-flash-exp',
  } = options;

  try {
    const response = await genai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    });

    return response.text?.trim() || '';
  } catch (error) {
    console.error('Gemini text generation error:', error);
    throw new Error(
      `Gemini text generation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
function estimateConfidence(response: string, context: string): number {
  let score = 0.5; // baseline

  // Boost confidence if:
  const hasCitations = /\[Chunk \d+\]|\(per .+ \d+-[KQ]\)/i.test(response);
  const hasSpecificNumbers = /\$[\d,]+|\d+%|revenue|earnings|EPS/i.test(response);
  const hasCoherentReasoning = response.length > 100 && !response.includes('...'); // Not truncated
  const hasMultipleSources = (response.match(/\[Chunk \d+\]/g) || []).length >= 3;

  if (hasCitations) score += 0.2;
  if (hasSpecificNumbers) score += 0.15;
  if (hasCoherentReasoning) score += 0.15;
  if (hasMultipleSources) score += 0.1;

  // Reduce confidence if:
  const hasUncertainty = /I think|maybe|possibly|not sure|might|could be/i.test(response);
  const missingContext = context.length < 100;
  const hasContradictions = /however|but|although/gi.test(response) && response.split('.').length < 3;

  if (hasUncertainty) score -= 0.2;
  if (missingContext) score -= 0.15;
  if (hasContradictions) score -= 0.1;

  return Math.max(0, Math.min(1, score));
}

/**
 * Extract cited sources from response
 * Looks for chunk IDs and filing references
 */
function extractSources(response: string): string[] {
  const sources: string[] = [];

  // Extract chunk IDs: [Chunk 1], [Chunk 2], etc.
  const chunkMatches = response.match(/\[Chunk \d+\]/g);
  if (chunkMatches) {
    sources.push(...chunkMatches);
  }

  // Extract filing references: (per TSLA 10-K), (Q3 2024 10-Q), etc.
  const filingMatches = response.match(/\(per .+? \d+-[KQ][^)]*\)/g);
  if (filingMatches) {
    sources.push(...filingMatches);
  }

  return [...new Set(sources)]; // Deduplicate
}

/**
 * Rough token estimate (1 token ≈ 4 characters)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Calculate estimated cost for Gemini usage
 * Pricing varies by model:
 * - Flash: $0.075 input, $0.30 output per 1M tokens
 * - Pro: $1.25 input, $5.00 output per 1M tokens
 */
export function calculateCost(
  tokensUsed: { input: number; output: number },
  model: GeminiModel
): number {
  const pricing: Record<GeminiModel, { input: number; output: number }> = {
    'gemini-2.5-flash': { input: 0.075, output: 0.30 },
    'gemini-2.0-flash': { input: 0.075, output: 0.30 },
    'gemini-1.5-flash-latest': { input: 0.075, output: 0.30 },
  };

  const modelPricing = pricing[model] || pricing['gemini-2.5-flash'];

  const inputCost = (tokensUsed.input / 1_000_000) * modelPricing.input;
  const outputCost = (tokensUsed.output / 1_000_000) * modelPricing.output;

  return inputCost + outputCost;
}

/**
 * Default system instruction for Finch (investor chat persona)
 * From AI_MODEL_STRATEGY.md
 */
const DEFAULT_SYSTEM_INSTRUCTION = `You are Finch, a calm, slightly sarcastic but deeply caring portfolio coach for retail investors.

Rules:
- Never give direct buy/sell orders (say "you might consider…")
- Always explain the why in 1–2 short sentences
- Mirror the user's emotional state first (greed → caution, fear → reassurance)
- Use loss aversion positively: "Most people regret selling in panic more than missing a 10% gain"
- End every rebalancing suggestion with a one-sentence behavioral nudge
- Keep answers under 180 words unless asked for depth
- Cite sources: Include chunk IDs or filing sections (e.g., "per TSLA 10-K Item 1A")

Tone Examples:
❌ "I recommend selling TSLA immediately due to overvaluation."
✅ "TSLA's P/E of 65 is stretched (per Q3 2024 10-Q). You might consider trimming 20% if you're worried about volatility."

❌ "Your portfolio is poorly diversified."
✅ "Three energy stocks? Bold. But if oil drops 30%, you'll feel it everywhere at once. (See 2020 crash for reference.)"

❌ "Don't panic sell."
✅ "I get it - seeing red sucks. But historically, panic selling locks in losses. Take a breath first? (Your thesis on CNQ still holds.)"`;

export default {
  generateChatResponse,
  generateText,
  calculateCost,
  DEFAULT_SYSTEM_INSTRUCTION,
};
