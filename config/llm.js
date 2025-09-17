require('dotenv').config();

const LLM_PROVIDERS = {
  OPENAI: 'openai',
  GROQ: 'groq',
  ANTHROPIC: 'anthropic',
  GEMINI: 'gemini'
};

const LLM_CONFIGS = {
  [LLM_PROVIDERS.OPENAI]: {
    name: 'OpenAI',
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-3.5-turbo',
    apiKeyEnv: 'OPENAI_API_KEY',
    headers: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    models: {
      'gpt-3.5-turbo': { maxTokens: 4096, contextWindow: 4096 },
      'gpt-4': { maxTokens: 8192, contextWindow: 8192 },
      'gpt-4-turbo': { maxTokens: 4096, contextWindow: 128000 }
    }
  },

  [LLM_PROVIDERS.GROQ]: {
    name: 'Groq',
    apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'llama-3.1-8b-instant',
    apiKeyEnv: 'GROQ_API_KEY',
    headers: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    models: {
      'llama-3.1-8b-instant': { maxTokens: 8192, contextWindow: 8192 },
      'llama-3.3-70b-versatile': { maxTokens: 8192, contextWindow: 8192 },
      'meta-llama/llama-4-scout-17b-16e-instruct': { maxTokens: 8192, contextWindow: 8192 },
      'meta-llama/llama-4-maverick-17b-128e-instruct': { maxTokens: 8192, contextWindow: 8192 },
      'gemma2-9b-it': { maxTokens: 8192, contextWindow: 8192 },
      'deepseek-r1-distill-llama-70b': { maxTokens: 8192, contextWindow: 8192 }
    }
  },

  [LLM_PROVIDERS.ANTHROPIC]: {
    name: 'Anthropic Claude',
    apiUrl: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-3-haiku-20240307',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    headers: (apiKey) => ({
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    }),
    models: {
      'claude-3-haiku-20240307': { maxTokens: 4096, contextWindow: 200000 },
      'claude-3-sonnet-20240229': { maxTokens: 4096, contextWindow: 200000 },
      'claude-3-opus-20240229': { maxTokens: 4096, contextWindow: 200000 }
    }
  },

  [LLM_PROVIDERS.GEMINI]: {
    name: 'Google Gemini',
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    defaultModel: 'gemini-pro',
    apiKeyEnv: 'GEMINI_API_KEY',
    headers: (apiKey) => ({
      'Content-Type': 'application/json'
    }),
    models: {
      'gemini-pro': { maxTokens: 2048, contextWindow: 30720 },
      'gemini-pro-vision': { maxTokens: 2048, contextWindow: 30720 }
    }
  }
};

class LLMConfig {
  constructor() {
    // Default to Groq as specified by user
    this.currentProvider = process.env.LLM_PROVIDER || LLM_PROVIDERS.GROQ;
    this.currentModel = process.env.LLM_MODEL || null;
    this.config = this.getCurrentConfig();
  }

  getCurrentConfig() {
    const providerConfig = LLM_CONFIGS[this.currentProvider];
    
    if (!providerConfig) {
      throw new Error(`Unsupported LLM provider: ${this.currentProvider}`);
    }

    const apiKey = process.env[providerConfig.apiKeyEnv];
    
    if (!apiKey) {
      console.warn(`⚠️  Missing API key for ${providerConfig.name}. Set ${providerConfig.apiKeyEnv} environment variable.`);
    }

    const model = this.currentModel || providerConfig.defaultModel;
    const modelConfig = providerConfig.models[model] || providerConfig.models[providerConfig.defaultModel];

    return {
      provider: this.currentProvider,
      providerName: providerConfig.name,
      apiUrl: providerConfig.apiUrl,
      model: model,
      apiKey: apiKey,
      headers: providerConfig.headers(apiKey),
      maxTokens: modelConfig?.maxTokens || 2048,
      contextWindow: modelConfig?.contextWindow || 4096,
      isConfigured: !!apiKey
    };
  }

  switchProvider(provider, model = null) {
    if (!LLM_CONFIGS[provider]) {
      throw new Error(`Unsupported LLM provider: ${provider}`);
    }

    this.currentProvider = provider;
    this.currentModel = model;
    this.config = this.getCurrentConfig();
    return this.config;
  }

  listAvailableProviders() {
    return Object.keys(LLM_CONFIGS).map(provider => ({
      id: provider,
      name: LLM_CONFIGS[provider].name,
      configured: !!process.env[LLM_CONFIGS[provider].apiKeyEnv],
      models: Object.keys(LLM_CONFIGS[provider].models)
    }));
  }

  getModelInfo(provider = null, model = null) {
    const targetProvider = provider || this.currentProvider;
    const providerConfig = LLM_CONFIGS[targetProvider];
    
    if (!providerConfig) {
      throw new Error(`Unsupported LLM provider: ${targetProvider}`);
    }

    const targetModel = model || this.currentModel || providerConfig.defaultModel;
    const modelConfig = providerConfig.models[targetModel];

    return {
      provider: targetProvider,
      providerName: providerConfig.name,
      model: targetModel,
      ...modelConfig
    };
  }

  validateConfiguration() {
    const issues = [];
    
    if (!this.config.isConfigured) {
      issues.push(`Missing API key for ${this.config.providerName}. Set ${LLM_CONFIGS[this.currentProvider].apiKeyEnv}`);
    }

    if (!this.config.model) {
      issues.push(`No model specified for ${this.config.providerName}`);
    }

    return {
      isValid: issues.length === 0,
      issues: issues,
      config: this.config
    };
  }
}

// Create singleton instance
const llmConfig = new LLMConfig();

// Log current configuration on startup
console.log(`LLM Configuration: ${llmConfig.config.providerName} (${llmConfig.config.model}) - ${llmConfig.config.isConfigured ? 'Configured' : 'Not Configured'}`);

module.exports = {
  llmConfig,
  LLM_PROVIDERS,
  LLM_CONFIGS
};
