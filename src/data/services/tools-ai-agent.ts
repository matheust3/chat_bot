import Groq from 'groq-sdk'
import { IAAgent } from '../../domain/services/ai-agent'
import { VectorMemoryStore, createHashEmbedding, cosineSimilarity, MemoryKind } from '../../infra/ai/vector-memory-store'
import toolsLoader from '../../main/config/tools'
import { IToolDefinition, IToolContext } from '../../domain/services/ai-tool'

interface ToolCall {
  tool: string
  args: Record<string, unknown>
}

interface ToolingAnswer {
  answer?: string
  tool?: string
  args?: Record<string, unknown>
  assistant?: string
}

interface ImportanceDecision {
  important: boolean
  summary?: string
}

interface MemoryMatch {
  id: string
  content: string
  score: number
}

interface MemoryActionDecision {
  action: 'add' | 'update' | 'ignore'
  summary?: string
  targetId?: string
}

export class ToolsAiAgent implements IAAgent {
  private readonly client: Groq
  private readonly memoryStore: VectorMemoryStore
  private readonly model: string
  private readonly integrationId: string
  private readonly maxImportantMemories: number
  private readonly memoriesHost: string
  private tools: IToolDefinition[]
  private toolsLoaded: boolean

  constructor (integrationId = 'whatsapp') {
    const apiKey = process.env.GROQ_API_KEY
    if (apiKey == null || apiKey === '') {
      throw new Error('GROQ_API_KEY não definida')
    }

    this.client = new Groq({ apiKey })
    this.memoryStore = new VectorMemoryStore()
    const rawModel = (process.env.BASIC_MODEL ?? '').trim()
    this.model = rawModel === '' ? 'llama-3.1-70b-versatile' : rawModel
    this.integrationId = integrationId
    const maxImportant = Number(process.env.AI_MEMORY_MAX_IMPORTANT ?? '50')
    this.maxImportantMemories = Number.isFinite(maxImportant) ? maxImportant : 50
    const host = (process.env.HOST ?? '').trim()
    this.memoriesHost = host
    this.tools = []
    this.toolsLoaded = false
  }

  async handleMessage (message: string, userId: string): Promise<string> {
    await this.ensureToolsLoaded()
    const scopedUserId = `${this.integrationId}:${userId}`
    const importantMemories = await this.listImportantMemories(scopedUserId)
    const memories = await this.searchMemories(scopedUserId, message, 6, ['conversation'])

    const systemPrompt = this.buildSystemPrompt(importantMemories, memories)
    const first = await this.askModel(systemPrompt, message)
    const toolCall = this.parseToolCall(first)

    let finalAnswer = ''

    if (toolCall != null) {
      const toolResult = await this.runTool(toolCall, scopedUserId)
      const followUp = await this.askModel(
        this.buildFollowUpPrompt(systemPrompt, toolCall, toolResult),
        message
      )
      const parsed = this.parseAnswer(followUp)
      finalAnswer = parsed.answer ?? followUp
    } else {
      const parsed = this.parseAnswer(first)
      finalAnswer = parsed.answer ?? first
    }

    if (finalAnswer.trim() === '') {
      finalAnswer = 'Não consegui responder agora. Tente novamente.'
    }

    const importance = await this.classifyImportance(message, finalAnswer)
    if (importance?.important === true) {
      const summary = this.normalizeImportantSummary(importance.summary ?? '')
      if (summary !== '') {
        const importantCount = await this.countImportantMemories(scopedUserId)
        if (importantCount >= this.maxImportantMemories) {
          const link = this.buildMemoriesLink()
          if (link !== '') {
            finalAnswer = `${finalAnswer}\n\nVocê atingiu o limite de memórias importantes. Gerencie em: ${link}`
          }
        } else {
          const matches = await this.findSimilarImportantMemories(scopedUserId, summary)
          const decision = await this.decideMemoryAction(summary, matches)
          if (decision.action === 'update' && decision.targetId != null) {
            const updated = (decision.summary ?? summary).trim()
            if (updated !== '') {
              await this.memoryStore.updateMemory(
                decision.targetId,
                `Importante: ${updated}`,
                createHashEmbedding(updated)
              )
            }
          } else if (decision.action === 'add') {
            const updated = (decision.summary ?? summary).trim()
            if (updated !== '') {
              await this.memoryStore.addMemory(
                scopedUserId,
                `Importante: ${updated}`,
                createHashEmbedding(updated),
                'important'
              )
            }
          }
        }
      }
    }

    await this.storeConversation(scopedUserId, message, finalAnswer)

    return finalAnswer.trim()
  }

  private async ensureToolsLoaded (): Promise<void> {
    if (this.toolsLoaded) return
    this.tools = await toolsLoader()
    this.toolsLoaded = true
  }

  private async runTool (call: ToolCall, userId: string): Promise<string> {
    const tool = this.tools.find((item) => item.name === call.tool)
    if (tool == null) {
      return `Ferramenta ${call.tool} não encontrada.`
    }

    const ctx: IToolContext = {
      userId,
      integrationId: this.integrationId,
      remember: async (note) => {
        const embedding = createHashEmbedding(note)
        await this.memoryStore.addMemory(userId, `Importante: ${note}`, embedding, 'important')
        return 'Nota importante salva.'
      },
      search: async (query, limit = 5) => {
        return await this.searchMemories(userId, query, limit, ['conversation', 'important'])
      }
    }

    return await tool.run(call.args ?? {}, ctx)
  }

  private buildSystemPrompt (importantMemories: string[], memories: string[]): string {
    const toolsDescription = this.tools
      .map((tool) => `- ${tool.name}: ${tool.description} | args: ${tool.input}`)
      .join('\n')

    const importantBlock = importantMemories.length > 0
      ? `Memórias importantes:\n${importantMemories.map((m) => `- ${m}`).join('\n')}`
      : 'Sem memórias importantes.'

    const memoryBlock = memories.length > 0
      ? `Memórias relevantes:\n${memories.map((m) => `- ${m}`).join('\n')}`
      : 'Sem memórias relevantes.'

    return [
      'Você é um agente de IA que pode usar ferramentas.',
      'Se precisar de uma ferramenta, responda SOMENTE com JSON:',
      '{"tool":"nome","args":{...}}',
      'Se não precisar, responda SOMENTE com JSON:',
      '{"answer":"texto da resposta"}',
      'Ferramentas disponíveis:',
      toolsDescription,
      importantBlock,
      memoryBlock
    ].join('\n')
  }

  private buildFollowUpPrompt (systemPrompt: string, call: ToolCall, toolResult: string): string {
    return [
      systemPrompt,
      `Ferramenta usada: ${call.tool}`,
      `Resultado da ferramenta: ${toolResult}`,
      'Agora responda ao usuário SOMENTE com JSON: {"answer":"texto da resposta"}'
    ].join('\n')
  }

  private async askModel (systemPrompt: string, message: string): Promise<string> {
    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.2,
        response_format: { type: 'text' }
      })

      return completion.choices[0]?.message?.content?.trim() ?? ''
    } catch (err) {
      const error = err as { error?: { error?: { code?: string } } }
      const code = error?.error?.error?.code
      if (code !== 'output_parse_failed') {
        throw err
      }

      const retry = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: 'Responda apenas com texto simples.' },
          { role: 'user', content: message }
        ],
        temperature: 0.2,
        response_format: { type: 'text' }
      })

      return retry.choices[0]?.message?.content?.trim() ?? ''
    }
  }

  private async classifyImportance (message: string, answer: string): Promise<ImportanceDecision | null> {
    const prompt = [
      'Você classifica se a mensagem contém informação útil e duradoura para lembrar.',
      'Considere como importante: preferências, objetivos, dados pessoais, rotina, contexto recorrente.',
      'Considere como NÃO importante: pedidos pontuais, listas temporárias, respostas efêmeras.',
      'Se for importante, gere um resumo curto e explícito em português, começando com "O usuário..." ou "O nome do usuário...".',
      'Responda SOMENTE com JSON no formato:',
      '{"important":true|false,"summary":"resumo curto"}',
      'Se não for importante, use "summary" vazio.'
    ].join('\n')

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: `Usuário: ${message}\nResposta: ${answer}` }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })

      const content = completion.choices[0]?.message?.content?.trim() ?? ''
      if (content === '') return null
      const parsed = JSON.parse(content) as ImportanceDecision
      if (typeof parsed.important !== 'boolean') return null
      return parsed
    } catch {
      return null
    }
  }

  private async decideMemoryAction (summary: string, matches: MemoryMatch[]): Promise<MemoryActionDecision> {
    if (matches.length === 0) {
      return { action: 'add', summary }
    }

    const prompt = [
      'Você decide o que fazer com uma memória importante nova.',
      'Se já existir uma memória equivalente, escolha "update" com o id alvo e um resumo atualizado.',
      'Se for nova, escolha "add" com o resumo.',
      'Se for duplicada sem mudança, escolha "ignore".',
      'Responda SOMENTE com JSON: {"action":"add|update|ignore","summary":"...","targetId":"..."}'
    ].join('\n')

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: prompt },
          {
            role: 'user',
            content: JSON.stringify({
              summary,
              matches: matches.map((m) => ({ id: m.id, content: m.content, score: Number(m.score.toFixed(3)) }))
            })
          }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })

      const content = completion.choices[0]?.message?.content?.trim() ?? ''
      if (content === '') return { action: 'add', summary }
      const parsed = JSON.parse(content) as MemoryActionDecision
      if (parsed.action !== 'add' && parsed.action !== 'update' && parsed.action !== 'ignore') {
        return { action: 'add', summary }
      }
      return parsed
    } catch {
      return { action: 'add', summary }
    }
  }

  private async findSimilarImportantMemories (userId: string, summary: string, limit = 5): Promise<MemoryMatch[]> {
    const embedding = createHashEmbedding(summary)
    const memories = await this.memoryStore.listRecent(userId, undefined, 'important')
    return memories
      .map((memory) => ({
        id: memory.id,
        content: memory.content,
        score: cosineSimilarity(embedding, memory.embedding)
      }))
      .filter((item) => item.score >= 0.2)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  private parseToolCall (content: string): ToolCall | null {
    const parsed = this.safeParse(content)
    if (parsed?.tool != null && typeof parsed.tool === 'string') {
      return { tool: parsed.tool, args: parsed.args ?? {} }
    }
    return null
  }

  private parseAnswer (content: string): ToolingAnswer {
    const parsed = this.safeParse(content)
    if (parsed?.answer != null && typeof parsed.answer === 'string') {
      return { answer: parsed.answer }
    }
    if (parsed?.assistant != null && typeof parsed.assistant === 'string') {
      return { answer: parsed.assistant }
    }
    return {}
  }

  private safeParse (content: string): ToolingAnswer | null {
    const match = content.match(/\{[\s\S]*\}/)
    if (match == null) return null
    try {
      return JSON.parse(match[0]) as ToolingAnswer
    } catch {
      return null
    }
  }

  private async searchMemories (userId: string, query: string, limit = 6, kinds?: MemoryKind[]): Promise<string[]> {
    const embedding = createHashEmbedding(query)
    const memories = await this.memoryStore.listRecent(userId, undefined, kinds)
    const scored = memories
      .map((memory) => ({
        content: memory.content,
        score: cosineSimilarity(embedding, memory.embedding)
      }))
      .filter((item) => item.score >= 0.2)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    if (scored.length > 0) {
      return scored.map((item) => item.content)
    }

    return memories
      .slice(0, limit)
      .map((item) => item.content)
  }

  private async listImportantMemories (userId: string, limit = 12): Promise<string[]> {
    const memories = await this.memoryStore.listRecent(userId, limit, 'important')
    const deduped: string[] = []
    const usedEmbeddings: number[][] = []

    for (const memory of memories) {
      const embedding = memory.embedding
      const isDuplicate = usedEmbeddings.some((existing) => cosineSimilarity(existing, embedding) >= 0.85)
      if (isDuplicate) continue
      deduped.push(memory.content)
      usedEmbeddings.push(embedding)
    }

    return deduped
  }

  private async storeConversation (userId: string, message: string, answer: string): Promise<void> {
    const trimmedMessage = message.trim()
    const trimmedAnswer = answer.trim()

    if (trimmedMessage !== '') {
      await this.memoryStore.addMemory(
        userId,
        `Usuário: ${trimmedMessage}`,
        createHashEmbedding(trimmedMessage),
        'conversation'
      )
    }

    if (trimmedAnswer !== '') {
      await this.memoryStore.addMemory(
        userId,
        `Assistente: ${trimmedAnswer}`,
        createHashEmbedding(trimmedAnswer),
        'conversation'
      )
    }
  }

  private normalizeImportantSummary (summary: string): string {
    const cleaned = summary
      .replace(/^\s*importante\s*:\s*/i, '')
      .replace(/^\s*mportante\s*:\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim()

    if (cleaned === '') return ''

    const nameMatch = cleaned.match(/^nome\s*:\s*(.+)$/i)
    if (nameMatch?.[1] != null) {
      return `O nome do usuário é ${nameMatch[1].trim()}`
    }

    const userMatch = cleaned.match(/^(?:eu\s+sou|sou|usu[aá]rio\s+é|usuario\s+é)\s+(.+)$/i)
    if (userMatch?.[1] != null) {
      return `O usuário é ${userMatch[1].trim()}`
    }

    if (!/^O\s+/i.test(cleaned)) {
      return `O usuário ${cleaned}`
    }

    return cleaned
  }

  private async countImportantMemories (userId: string): Promise<number> {
    const rows = await this.memoryStore.listRecent(userId, this.maxImportantMemories + 1, 'important')
    return rows.length
  }

  private buildMemoriesLink (): string {
    if (this.memoriesHost === '') return ''
    const normalized = this.memoriesHost.endsWith('/')
      ? this.memoriesHost.slice(0, -1)
      : this.memoriesHost
    return `${normalized}/memories`
  }
}
