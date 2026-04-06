/**
 * Application Configuration
 */

export const config = {
  ai: {
    provider: 'groq',
    model: 'llama-3.1-8b-instant',
    apiKey: process.env.GROQ_API_KEY,
    maxTokens: 2048,
    temperature: 0.7,
  },
  ats: {
    minKeywordMatch: 70,
    keywordWeight: {
      high: ['required', 'must have', 'essential'],
      medium: ['preferred', 'desired', 'plus'],
      low: ['nice to have', 'bonus']
    }
  },
  templates: {
    classic: 'classic',
    modern: 'modern',
    minimalist: 'minimalist'
  },
  export: {
    formats: ['pdf', 'docx'],
    quality: 'high',
    margins: { top: 20, bottom: 20, left: 20, right: 20 }
  },
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'MyDreamResume',
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    description: 'AI-powered resume builder with ATS optimization'
  }
} as const;

export type Config = typeof config;
export type AIProvider = typeof config.ai.provider;
export type ResumeTemplate = typeof config.templates[keyof typeof config.templates];
export type ExportFormat = typeof config.export.formats[number];
