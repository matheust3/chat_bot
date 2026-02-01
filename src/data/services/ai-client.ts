import OpenAI from 'openai'

export interface AiClientConfig {
  baseURL: string
  apiKey: string
  model: string
}

export const resolveAiConfig = (): AiClientConfig => {
  const baseURL = (process.env.AI_BASE_URL ?? '').trim()
  const apiKey = (process.env.AI_API_KEY ?? '').trim()
  const model = (process.env.AI_MODEL ?? '').trim()

  const fallbackKey = (process.env.GROQ_API_KEY ?? '').trim()
  const fallbackModel = ((process.env.BASIC_MODEL ?? '').trim() !== '' ? (process.env.BASIC_MODEL ?? '').trim() : 'llama-3.1-70b-versatile')

  const resolvedBaseURL = baseURL !== '' ? baseURL : 'https://api.groq.com/openai/v1'
  const resolvedApiKey = apiKey !== '' ? apiKey : fallbackKey
  const resolvedModel = model !== '' ? model : fallbackModel

  if (resolvedApiKey === '') {
    throw new Error('AI_API_KEY não definida')
  }

  return {
    baseURL: resolvedBaseURL,
    apiKey: resolvedApiKey,
    model: resolvedModel
  }
}

export const createAiClient = (): { client: OpenAI, model: string } => {
  const config = resolveAiConfig()
  return {
    client: new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL }),
    model: config.model
  }
}
