import { IClient } from '../protocols/IClient'
import { IMessage } from '../protocols/IMessage'
import { GroupMessagesRepositoryInstance } from '../singletons/group-messages-repository-instance'
import { GroupSummaryAgent } from '../../data/services/group-summary-agent'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200
const MIN_LIMIT = 10

const parseLimit = (args?: string[]): number => {
  if (args == null || args.length === 0) {
    return DEFAULT_LIMIT
  }

  for (const arg of args) {
    const match = arg.match(/\d+/)
    if (match != null) {
      const value = parseInt(match[0], 10)
      if (!Number.isNaN(value)) {
        return Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, value))
      }
    }
  }

  return DEFAULT_LIMIT
}

export default async (message: IMessage, client: IClient): Promise<void> => {
  if (message.command?.command !== 'resumo') {
    return
  }

  if (message.groupId === undefined) {
    await client.sendText(message.from, 'Esse comando só pode ser usado em grupos', { quotedMsg: message.id })
    return
  }

  if (process.env.GROQ_API_KEY == null || process.env.GROQ_API_KEY.length === 0) {
    await client.sendText(message.groupId, 'Resumo indisponível no momento.', { quotedMsg: message.id })
    return
  }

  const limit = parseLimit(message.command.args)
  const messages = await GroupMessagesRepositoryInstance.getRecentGroupMessages(message.groupId, limit)

  if (messages.length === 0) {
    await client.sendText(message.groupId, 'Ainda não tenho mensagens suficientes para resumir.', { quotedMsg: message.id })
    return
  }

  const ordered = messages
    .slice()
    .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime())

  const agent = new GroupSummaryAgent()
  const summary = await agent.summarize(ordered, message.groupName)

  await client.sendText(message.groupId, summary, { quotedMsg: message.id })
}
