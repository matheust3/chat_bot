import Groq from 'groq-sdk'
import { IAAgent } from '../../domain/services/ai-agent'
import { VectorMemoryStore, createHashEmbedding, cosineSimilarity } from '../../infra/ai/vector-memory-store'
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

export class ToolsAiAgent implements IAAgent {
  private readonly client: Groq
  private readonly memoryStore: VectorMemoryStore
  private readonly model: string
  private readonly integrationId: string
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
    this.tools = []
    this.toolsLoaded = false
  }

  async handleMessage (message: string, userId: string): Promise<string> {
    await this.ensureToolsLoaded()
    const scopedUserId = `${this.integrationId}:${userId}`
    const memories = await this.searchMemories(scopedUserId, message)

    const systemPrompt = this.buildSystemPrompt(memories)
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
        await this.memoryStore.addMemory(userId, `Nota: ${note}`, embedding)
        return 'Nota salva.'
      },
      search: async (query, limit = 5) => {
        return await this.searchMemories(userId, query, limit)
      }
    }

    return await tool.run(call.args ?? {}, ctx)
  }

  private buildSystemPrompt (memories: string[]): string {
    const toolsDescription = this.tools
      .map((tool) => `- ${tool.name}: ${tool.description} | args: ${tool.input}`)
      .join('\n')

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

  private async searchMemories (userId: string, query: string, limit = 6): Promise<string[]> {
    const embedding = createHashEmbedding(query)
    const memories = await this.memoryStore.listRecent(userId)
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

  private async storeConversation (userId: string, message: string, answer: string): Promise<void> {
    const trimmedMessage = message.trim()
    const trimmedAnswer = answer.trim()

    if (trimmedMessage !== '') {
      await this.memoryStore.addMemory(
        userId,
        `Usuário: ${trimmedMessage}`,
        createHashEmbedding(trimmedMessage)
      )
    }

    if (trimmedAnswer !== '') {
      await this.memoryStore.addMemory(
        userId,
        `Assistente: ${trimmedAnswer}`,
        createHashEmbedding(trimmedAnswer)
      )
    }
  }
}
