import { IClient } from '../protocols/IClient'
import { IMessage } from '../protocols/IMessage'
import { GroupMessagesRepositoryInstance } from '../singletons/group-messages-repository-instance'
import { GroupSummaryCheckpointRepositoryInstance } from '../singletons/group-summary-checkpoint-repository-instance'
import { GroupSummaryAgent } from '../../data/services/group-summary-agent'

const CHUNK_LIMIT = 300

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

  const lastSummarizedAt = await GroupSummaryCheckpointRepositoryInstance.getLastSummarizedAt(message.groupId)
  const pendingCount: number = await GroupMessagesRepositoryInstance.countMessagesSince(message.groupId, lastSummarizedAt)

  if (pendingCount === 0) {
    await client.sendText(message.groupId, 'Nenhuma nova mensagem desde o último resumo.', { quotedMsg: message.id })
    return
  }

  const chunkSize: number = Math.min(CHUNK_LIMIT, pendingCount)
  const messages = await GroupMessagesRepositoryInstance.getMessagesSince(message.groupId, lastSummarizedAt, chunkSize)

  if (messages.length === 0) {
    await client.sendText(message.groupId, 'Não consegui carregar as mensagens para resumir.', { quotedMsg: message.id })
    return
  }

  const ordered = messages
    .slice()
    .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime())

  const agent = new GroupSummaryAgent()
  const summary = await agent.summarize(ordered, message.groupName)

  const lastProcessed = ordered[ordered.length - 1]?.sentAt
  if (lastProcessed != null) {
    await GroupSummaryCheckpointRepositoryInstance.setLastSummarizedAt(message.groupId, new Date(lastProcessed))
  }

  const hasMore = pendingCount > CHUNK_LIMIT
  const footer = hasMore
    ? `\n\n⚠️ Resumo parcial: processadas ${chunkSize} de ${pendingCount} novas mensagens. Envie #resumo novamente para continuar.`
    : `\n\n✅ Resumo completo das ${pendingCount} novas mensagens.`

  await client.sendText(message.groupId, `${summary}${footer}`, { quotedMsg: message.id })
}
