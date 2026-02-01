import { randomUUID } from 'node:crypto'
import { IAAgent } from '../../domain/services/ai-agent'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { VectorMemoryStore, createHashEmbedding, cosineSimilarity, MemoryKind, MemoryRecord } from '../../infra/ai/vector-memory-store'

interface MemoryStore {
  add: (userId: string, content: string, kind: MemoryKind) => Promise<void>
  search: (userId: string, query: string, limit: number) => Promise<string[]>
  listRecent: (userId: string, limit: number) => Promise<string[]>
}

class InMemoryStore implements MemoryStore {
  private readonly records: Map<string, MemoryRecord[]> = new Map()

  async add (userId: string, content: string, kind: MemoryKind): Promise<void> {
    const list = this.records.get(userId) ?? []
    const embedding = createHashEmbedding(content)
    list.unshift({ id: randomUUID(), content, createdAt: new Date(), embedding, kind })
    this.records.set(userId, list)
  }

  async search (userId: string, query: string, limit: number): Promise<string[]> {
    const list = this.records.get(userId) ?? []
    if (list.length === 0) return []
    const queryEmbedding = createHashEmbedding(query)
    const ranked = list
      .map((item) => ({
        score: cosineSimilarity(item.embedding, queryEmbedding),
        content: item.content
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
    return ranked.map((item) => item.content)
  }

  async listRecent (userId: string, limit: number): Promise<string[]> {
    const list = this.records.get(userId) ?? []
    return list
      .filter((item) => item.kind === 'conversation')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
      .map((item) => item.content)
  }
}

class VectorStoreAdapter implements MemoryStore {
  constructor (private readonly store: VectorMemoryStore) {}

  async add (userId: string, content: string, kind: MemoryKind): Promise<void> {
    const embedding = createHashEmbedding(content)
    await this.store.addMemory(userId, content, embedding, kind)
  }

  async search (userId: string, query: string, limit: number): Promise<string[]> {
    const memories = await this.store.listRecent(userId, 200, ['important', 'conversation'])
    if (memories.length === 0) return []
    const queryEmbedding = createHashEmbedding(query)
    const ranked = memories
      .map((item) => ({
        score: cosineSimilarity(item.embedding, queryEmbedding),
        content: item.content
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
    return ranked.map((item) => item.content)
  }

  async listRecent (userId: string, limit: number): Promise<string[]> {
    const memories = await this.store.listRecent(userId, limit, 'conversation')
    return memories.map((item) => item.content)
  }
}

const runCrewAi = async (payload: { message: string, context: string, userId: string }): Promise<{ answer?: string, error?: string }> => {
  const runner = path.resolve(process.cwd(), 'scripts', 'crewai_runner.py')
  const pythonEnv = String(process.env.CREWAI_PYTHON ?? '').trim()
  const python = pythonEnv !== '' ? pythonEnv : 'python3'

  return await new Promise((resolve) => {
    const child = spawn(python, [runner], { stdio: ['pipe', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (data: Buffer) => {
      stdout += String(data)
    })
    child.stderr.on('data', (data: Buffer) => {
      stderr += String(data)
    })
    child.on('close', () => {
      const content = stdout.trim()
      if (content === '') {
        const err = stderr.trim()
        resolve({ error: err !== '' ? err : 'Resposta vazia do CrewAI.' })
        return
      }
      try {
        resolve(JSON.parse(content) as { answer?: string, error?: string })
      } catch {
        resolve({ error: `Resposta inválida do CrewAI: ${content}` })
      }
    })

    child.stdin.write(JSON.stringify(payload))
    child.stdin.end()
  })
}

export class ToolsAiAgent implements IAAgent {
  private readonly integrationId: string
  private readonly memory: MemoryStore

  constructor (integrationId: string) {
    this.integrationId = integrationId
    this.memory = this.createMemoryStore()
  }

  private createMemoryStore (): MemoryStore {
    try {
      const store = new VectorMemoryStore()
      return new VectorStoreAdapter(store)
    } catch {
      return new InMemoryStore()
    }
  }

  private async buildConversationContext (userId: string): Promise<string> {
    const recent = await this.memory.listRecent(userId, 12)
    if (recent.length === 0) return ''
    const ordered = [...recent].reverse()
    const formatted = ordered.map((line, index) => `(${index + 1}) ${line}`).join('\n')
    return [
      'Contexto da conversa (mais recente por último):',
      formatted
    ].join('\n')
  }

  async handleMessage (message: string, userId: string): Promise<string> {
    const text = String(message ?? '').trim()
    if (text === '') return 'Mensagem vazia.'

    await this.memory.add(userId, `Usuário: ${text}`, 'conversation')

    const conversationContext = await this.buildConversationContext(userId)
    const payload = {
      message: text,
      context: conversationContext,
      userId
    }

    const result = await runCrewAi(payload)
    if (result.error != null && result.error.trim() !== '') {
      return result.error
    }

    const answer = String(result.answer ?? '').trim()
    if (answer === '') return 'Não consegui responder agora.'
    await this.memory.add(userId, `Assistente: ${answer}`, 'conversation')
    return answer
  }
}
