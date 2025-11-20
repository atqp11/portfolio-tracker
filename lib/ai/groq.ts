/**
 * Groq AI Service
 *
 * Primary model for bulk processing tasks:
 * - SEC filing extraction and summarization
 * - News batch processing (3x/day)
 * - Social sentiment analysis
 *
 * Uses Groq GPT-OSS 20B for cost-effective, high-speed processing.
 * Quality: 9.0/10 for summarization tasks
 * Speed: 800+ tokens/second
 * Cost: $0.10 input, $0.10 output per 1M tokens
 */

import Groq from 'groq-sdk';

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

export interface GroqOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface GroqResponse {
  text: string;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
  model: string;
  latencyMs: number;
}

/**
 * Generate text using Groq GPT-OSS 20B
 * Optimized for bulk summarization tasks
 */
export async function generateText(
  prompt: string,
  systemPrompt: string = 'You are a financial analyst assistant. Provide concise, accurate summaries.',
  options: GroqOptions = {}
): Promise<GroqResponse> {
  const startTime = Date.now();

  const {
    temperature = 0.0, // Deterministic for batch processing
    maxTokens = 2048,
    model = 'llama3-groq-70b-8192-tool-use-preview', // Groq's fast model
  } = options;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model,
      temperature,
      max_tokens: maxTokens,
    });

    const responseText = chatCompletion.choices[0]?.message?.content || '';
    const usage = chatCompletion.usage;

    const latencyMs = Date.now() - startTime;

    return {
      text: responseText,
      tokensUsed: {
        input: usage?.prompt_tokens || 0,
        output: usage?.completion_tokens || 0,
        total: usage?.total_tokens || 0,
      },
      model,
      latencyMs,
    };
  } catch (error) {
    console.error('Groq API error:', error);
    throw new Error(`Groq generation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Summarize SEC filing chunks
 * Optimized for financial document summarization
 */
export async function summarizeFiling(
  chunks: string[],
  filingType: string,
  companyName: string
): Promise<string> {
  const systemPrompt = `You are FinSumm-Assistant, an expert financial document summarizer.

Rules:
- Use only the provided excerpts
- For each factual statement, include the source chunk ID
- If a number or claim is not present in the retrieved context, say "not in provided context"
- Output format: short headline, 5 key bullets (with chunk IDs), material risks, follow-ups, suggested action

Example output:
**Headline:** Q3 2024 Revenue Misses Estimates, Guidance Reduced

**Key Points:**
1. [Chunk 1] Revenue: $2.3B (-8% YoY) vs. $2.5B expected
2. [Chunk 2] Net income: $450M (-12% YoY)
3. [Chunk 3] Guidance reduced: FY2024 EPS $1.80-$2.00 (was $2.20-$2.40)
4. [Chunk 5] China sales down 25% due to regulatory headwinds
5. [Chunk 7] Management cites "temporary headwinds" but provides no timeline

**Material Risks:**
- [Chunk 9] Ongoing regulatory investigation in China (potential fines up to $500M)
- [Chunk 11] Customer concentration: Top 3 clients = 60% of revenue

**Follow-ups:**
- Monitor China regulatory developments
- Watch for customer diversification efforts

**Suggested Action:**
Hold position if long-term thesis intact; trim 20% if near-term volatility is a concern.`;

  const chunkedText = chunks
    .map((chunk, i) => `[Chunk ${i + 1}]\n${chunk}`)
    .join('\n\n');

  const prompt = `Summarize the following ${filingType} filing for ${companyName}:

${chunkedText}`;

  const response = await generateText(prompt, systemPrompt, {
    temperature: 0.0,
    maxTokens: 2048,
  });

  return response.text;
}

/**
 * Batch process news articles for sentiment
 * Optimized for news summarization
 */
export async function analyzeNewsSentiment(
  articles: Array<{ headline: string; summary: string; source: string }>,
  symbol: string
): Promise<{
  sentiment: 'positive' | 'neutral' | 'negative';
  keyPoints: string[];
  relevance: number;
}> {
  const systemPrompt = `You are a financial news analyst. Analyze news articles for sentiment and key points.

Output format (JSON):
{
  "sentiment": "positive" | "neutral" | "negative",
  "keyPoints": ["bullet 1", "bullet 2", "bullet 3"],
  "relevance": 0.0-1.0 (how relevant is this news to the stock price)
}`;

  const articlesText = articles
    .map(
      (article, i) =>
        `[Article ${i + 1}] ${article.source}\nHeadline: ${article.headline}\n${article.summary}`
    )
    .join('\n\n');

  const prompt = `Analyze the following news articles for ${symbol}:

${articlesText}

Provide sentiment, key points, and relevance score.`;

  const response = await generateText(prompt, systemPrompt, {
    temperature: 0.1,
    maxTokens: 1024,
  });

  try {
    const parsed = JSON.parse(response.text);
    return parsed;
  } catch (error) {
    console.error('Failed to parse Groq JSON response:', error);
    // Fallback
    return {
      sentiment: 'neutral',
      keyPoints: [response.text.slice(0, 200)],
      relevance: 0.5,
    };
  }
}

/**
 * Calculate estimated cost for Groq usage
 * Pricing: $0.10 input, $0.10 output per 1M tokens
 */
export function calculateCost(tokensUsed: { input: number; output: number }): number {
  const INPUT_COST_PER_1M = 0.10;
  const OUTPUT_COST_PER_1M = 0.10;

  const inputCost = (tokensUsed.input / 1_000_000) * INPUT_COST_PER_1M;
  const outputCost = (tokensUsed.output / 1_000_000) * OUTPUT_COST_PER_1M;

  return inputCost + outputCost;
}

export default {
  generateText,
  summarizeFiling,
  analyzeNewsSentiment,
  calculateCost,
};
