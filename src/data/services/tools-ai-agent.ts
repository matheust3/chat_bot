import { IAAgent } from '../../domain/services/ai-agent'
import { spawn } from 'node:child_process'
import path from 'node:path'

const parseJsonFromOutput = (content: string): { answer?: string, error?: string } | null => {
  const match = content.match(/\{[\s\S]*\}/)
  if (match == null) return null
  try {
    return JSON.parse(match[0]) as { answer?: string, error?: string }
  } catch {
    return null
  }
}

const runCrewAi = async (payload: { message: string, userId: string }): Promise<{ answer?: string, error?: string }> => {
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
      const parsed = parseJsonFromOutput(content)
      if (parsed != null) {
        resolve(parsed)
        return
      }
      resolve({ error: `Resposta inválida do CrewAI: ${content}` })
    })

    child.stdin.write(JSON.stringify(payload))
    child.stdin.end()
  })
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
