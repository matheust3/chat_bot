import toolsLoader from '../config/tools'
import { IToolDefinition, IToolContext } from '../../domain/services/ai-tool'
import { createAiClient } from '../../data/services/ai-client'

interface ToolCall {
  tool: string
  args: Record<string, unknown>
}

interface ToolingAnswer {
  answer?: string
  tool?: string
  args?: Record<string, unknown>
}

const buildSystemPrompt = (toolsDescription: string): string => {
  return [
    'Você é um agente auxiliar especializado em executar tarefas delegadas.',
    'Resolva a tarefa usando raciocínio interno, sem expor etapas.',
    'Se precisar de ferramentas, use apenas as listadas.',
    'Enquanto estiver usando ferramentas, responda SOMENTE com JSON: {"tool":"nome","args":{...}}',
    'Quando terminar, responda SOMENTE com JSON: {"answer":"texto da resposta"}',
    'Ferramentas disponíveis:',
    toolsDescription
  ].join('\n')
}

const safeParse = (content: string): ToolingAnswer | null => {
  const match = content.match(/\{[\s\S]*\}/)
  if (match == null) return null
  try {
    return JSON.parse(match[0]) as ToolingAnswer
  } catch {
    return null
  }
}

const parseToolCall = (content: string): ToolCall | null => {
  const parsed = safeParse(content)
  if (parsed?.tool != null && typeof parsed.tool === 'string') {
    return { tool: parsed.tool, args: parsed.args ?? {} }
  }
  return null
}

const parseAnswer = (content: string): string | null => {
  const parsed = safeParse(content)
  if (parsed?.answer != null && typeof parsed.answer === 'string') {
    return parsed.answer
  }
  return null
}

const askModel = async (client: ReturnType<typeof createAiClient>['client'], model: string, systemPrompt: string, message: string): Promise<string> => {
  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    })

    return completion.choices[0]?.message?.content?.trim() ?? ''
  } catch (err) {
    const error = err as { error?: { error?: { code?: string } } }
    const code = error?.error?.error?.code
    if (code !== 'output_parse_failed' && code !== 'json_validate_failed') {
      throw err
    }

    const retry = await client.chat.completions.create({
      model,
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

const tool: IToolDefinition = {
  name: 'delegate_task',
  description: 'Cria um agente interno para executar uma tarefa e retornar um resumo útil.',
  input: '{"task":"tarefa a executar","context":"opcional","tools":["opcional"],"maxSteps":4}',
  run: async (args, ctx: IToolContext) => {
    const task = String(args.task ?? '').trim()
    const context = String(args.context ?? '').trim()
    if (task === '') return 'Tarefa vazia.'

    let clientConfig: ReturnType<typeof createAiClient>
    try {
      clientConfig = createAiClient()
    } catch {
      return 'AI_API_KEY não definida.'
    }
    const model = clientConfig.model
    const client = clientConfig.client

    const allowedTools = Array.isArray(args.tools)
      ? args.tools.map((item) => String(item)).filter((item) => item.trim() !== '')
      : []

    const allTools = await toolsLoader()
    const toolPool = allowedTools.length > 0
      ? allTools.filter((toolItem) => allowedTools.includes(toolItem.name))
      : []

    const filteredTools = toolPool.filter((toolItem) => toolItem.name !== 'delegate_task')

    const toolsDescription = filteredTools.length > 0
      ? filteredTools.map((toolItem) => `- ${toolItem.name}: ${toolItem.description} | args: ${toolItem.input}`).join('\n')
      : 'Sem ferramentas disponíveis.'

    const systemPrompt = buildSystemPrompt(toolsDescription)
    const userPrompt = context !== ''
      ? `Tarefa: ${task}\nContexto: ${context}`
      : `Tarefa: ${task}`

    const maxStepsRaw = typeof args.maxSteps === 'number' ? args.maxSteps : Number(args.maxSteps)
    const maxSteps = Number.isFinite(maxStepsRaw)
      ? Math.min(Math.max(Math.floor(maxStepsRaw), 1), 6)
      : 4

    for (let step = 0; step < maxSteps; step += 1) {
      const modelOutput = await askModel(client, model, systemPrompt, userPrompt)
      const answer = parseAnswer(modelOutput)
      if (answer != null && answer.trim() !== '') {
        return answer.trim()
      }

      const call = parseToolCall(modelOutput)
      if (call == null) {
        return modelOutput
      }

      const toolMatch = filteredTools.find((toolItem) => toolItem.name === call.tool)
      if (toolMatch == null) {
        return 'Ferramenta solicitada não está disponível para esta tarefa.'
      }

      const result = await toolMatch.run(call.args ?? {}, ctx)
      const followUp = await askModel(client, model, [
        systemPrompt,
        `Ferramenta usada: ${call.tool}`,
        `Resultado da ferramenta: ${result}`,
        'Responda ao usuário SOMENTE com JSON: {"answer":"texto da resposta"}'
      ].join('\n'), userPrompt)
      const finalAnswer = parseAnswer(followUp)
      if (finalAnswer != null && finalAnswer.trim() !== '') {
        return finalAnswer.trim()
      }
    }

    return 'Não consegui concluir a tarefa.'
  }
}

export default tool
