// Multi-Model AI Router for Portfolio Tracker
// Implements smart routing logic as per PRD with OpenRouter models + Gemini fallback

export type ModelTier = 'tier1' | 'tier2' | 'tier3' | 'fallback';

export interface ModelConfig {
  name: string;
  provider: 'openrouter' | 'google';
  modelId: string;
  costPerToken?: number;
  maxTokens?: number;
  enabled: boolean;
}

export interface AIRouterConfig {
  tier1: ModelConfig[];
  tier2: ModelConfig[];
  tier3: ModelConfig[];
  fallback: ModelConfig[];
}

export interface QueryContext {
  query: string;
  queryLength: number;
  queryType?: 'quick_summary' | 'sec_filing' | 'deep_analysis' | 'general';
  tokens?: number;
}

// Multi-model configuration as per PRD
export const defaultAIRouterConfig: AIRouterConfig = {
  // Tier 1 (Fast/Cheap): DeepSeek, Qwen Plus, Llama 3.1-70B
  tier1: [
    { name: 'DeepSeek v3', provider: 'openrouter', modelId: 'deepseek/deepseek-chat', enabled: true, costPerToken: 0.00000027 },
    { name: 'Qwen Plus', provider: 'openrouter', modelId: 'qwen/qwen-2.5-72b-instruct', enabled: true, costPerToken: 0.0000005 },
    { name: 'Llama 3.1 70B', provider: 'openrouter', modelId: 'meta-llama/llama-3.1-70b-instruct', enabled: true, costPerToken: 0.00000035 },
    { name: 'Gemini 2.5 Flash', provider: 'google', modelId: 'gemini-2.5-flash', enabled: true },
  ],
  // Tier 2 (Quality): Gemini (instead of Claude), Qwen Max, Kimi K2
  tier2: [
    { name: 'Gemini 2.0 Flash Thinking', provider: 'google', modelId: 'gemini-2.0-flash-thinking-exp', enabled: true },
    { name: 'Qwen Max', provider: 'openrouter', modelId: 'qwen/qwen-2.5-coder-32b-instruct', enabled: true, costPerToken: 0.0000005 },
    { name: 'Gemini 2.5 Flash', provider: 'google', modelId: 'gemini-2.5-flash', enabled: true },
  ],
  // Tier 3 (Reasoning): Gemini (instead of Claude), DeepSeek Reasoner
  tier3: [
    { name: 'Gemini 2.0 Flash Thinking', provider: 'google', modelId: 'gemini-2.0-flash-thinking-exp', enabled: true },
    { name: 'DeepSeek Reasoner', provider: 'openrouter', modelId: 'deepseek/deepseek-r1', enabled: true, costPerToken: 0.00000055 },
    { name: 'Gemini 2.0 Flash Exp', provider: 'google', modelId: 'gemini-2.0-flash-exp', enabled: true },
  ],
  // Fallback: Mistral Large, Llama 3.1-405B, Gemini
  fallback: [
    { name: 'Mistral Large', provider: 'openrouter', modelId: 'mistralai/mistral-large', enabled: true, costPerToken: 0.000002 },
    { name: 'Llama 3.1 405B', provider: 'openrouter', modelId: 'meta-llama/llama-3.1-405b-instruct', enabled: true, costPerToken: 0.0000027 },
    { name: 'Gemini 1.5 Flash', provider: 'google', modelId: 'gemini-1.5-flash', enabled: true },
    { name: 'Gemini 1.5 Pro', provider: 'google', modelId: 'gemini-1.5-pro', enabled: true },
  ],
};

/**
 * Determine which tier to use based on query characteristics
 * Implements smart routing logic as per PRD
 */
export function determineQueryTier(context: QueryContext): ModelTier {
  const { query, queryLength, queryType, tokens } = context;
  const lowerQuery = query.toLowerCase();

  // Tier 1 (Fast/Cheap): Quick summaries, short queries
  if (queryType === 'quick_summary' || queryLength < 200) {
    return 'tier1';
  }

  // Tier 3 (Reasoning): SEC filings, large token counts, complex analysis
  if (
    queryType === 'sec_filing' ||
    (tokens && tokens > 10000) ||
    lowerQuery.includes('sec filing') ||
    lowerQuery.includes('10-q') ||
    lowerQuery.includes('10-k') ||
    lowerQuery.includes('8-k')
  ) {
    return 'tier3';
  }

  // Tier 2 (Quality): Deep analysis requests
  if (
    queryType === 'deep_analysis' ||
    lowerQuery.includes('analyze') ||
    lowerQuery.includes('compare') ||
    lowerQuery.includes('thesis') ||
    lowerQuery.includes('validate')
  ) {
    return 'tier2';
  }

  // Default to Tier 1 for everything else
  return 'tier1';
}

/**
 * Get the first enabled model from a tier
 */
export function getModelForTier(tier: ModelTier): ModelConfig | null {
  const models = defaultAIRouterConfig[tier];
  const enabledModel = models.find(m => m.enabled);
  return enabledModel || null;
}

/**
 * Route a query to the appropriate model tier
 * Returns the selected model configuration
 */
export function routeQuery(query: string, preferredTier?: ModelTier): { tier: ModelTier; model: ModelConfig } {
  // Determine tier based on query characteristics
  const context: QueryContext = {
    query,
    queryLength: query.length,
    tokens: Math.ceil(query.length / 4), // Rough token estimate
  };

  const tier: ModelTier = preferredTier || determineQueryTier(context);
  const model = getModelForTier(tier);

  if (!model) {
    // Fallback to tier1 if no model found
    const fallbackModel = getModelForTier('tier1');
    if (!fallbackModel) {
      throw new Error('No enabled models available');
    }
    return { tier: 'tier1', model: fallbackModel };
  }

  return { tier, model };
}
