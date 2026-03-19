import type { IAProvider } from './types'
import { MockProvider } from './mock-provider'

export function getAIProvider(): IAProvider {
  const provider = process.env.AI_PROVIDER ?? 'mock'

  switch (provider) {
    case 'openai': {
      const { OpenAIProvider } = require('./openai-provider')
      return new OpenAIProvider()
    }
    case 'anthropic': {
      const { AnthropicProvider } = require('./anthropic-provider')
      return new AnthropicProvider()
    }
    case 'mock':
    default:
      return new MockProvider()
  }
}

export type { IAProvider, AIAnalysisRequest, AIAnalysisResponse } from './types'
