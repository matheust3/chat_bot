import { IAAgent } from '../../domain/services/ai-agent'
import Redis from 'ioredis'
import { v4 as uuidv4 } from 'uuid'

const parseJsonFromOutput = (content: string): { answer?: string, error?: string } | null => {
  try {
    return JSON.parse(content) as { answer?: string, error?: string }
  } catch {
    return null
  }
}

const REQUEST_QUEUE = String(process.env.AI_REQUEST_QUEUE ?? 'ai.requests')
const RESPONSE_PREFIX = String(process.env.AI_RESPONSE_PREFIX ?? 'ai.responses.')
const RESPONSE_TIMEOUT_SECONDS = Number(process.env.AI_RESPONSE_TIMEOUT_SECONDS ?? 30)

const runCrewAi = async (payload: { message: string, userId: string }): Promise<{ answer?: string, error?: string }> => {
  const redisUrl = String(process.env.REDIS_URL ?? '').trim()
  if (redisUrl === '') {
    return { error: 'REDIS_URL não definida.' }
  }

  const requestId = uuidv4()
  const responseKey = `${RESPONSE_PREFIX}${requestId}`
  const redis = new Redis(redisUrl)

  try {
    await redis.rpush(REQUEST_QUEUE, JSON.stringify({
      id: requestId,
      responseKey,
      message: payload.message,
      userId: payload.userId
    }))

    const response = await redis.blpop(responseKey, RESPONSE_TIMEOUT_SECONDS)
    if (response == null) {
      return { error: 'Tempo esgotado ao aguardar resposta do agente.' }
    }

    const [, raw] = response
    if (raw == null || raw.trim() === '') {
      return { error: 'Resposta vazia do agente.' }
    }

    const parsed = parseJsonFromOutput(raw)
    if (parsed != null) return parsed
    return { error: `Resposta inválida do agente: ${raw}` }
  } finally {
    try {
      await redis.del(responseKey)
    } catch {}
    await redis.quit()
  }
}

export class ToolsAiAgent implements IAAgent {
  constructor (private readonly integrationId: string) {}

  async handleMessage (message: string, userId: string): Promise<string> {
    const text = String(message ?? '').trim()
    if (text === '') return 'Mensagem vazia.'

    const result = await runCrewAi({ message: text, userId })
    if (result.error != null && result.error.trim() !== '') {
      return result.error
    }

    const answer = String(result.answer ?? '').trim()
    if (answer === '') return 'Não consegui responder agora.'
    return answer
  }
}
