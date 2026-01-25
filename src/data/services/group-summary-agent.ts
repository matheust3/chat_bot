import Groq from 'groq-sdk'
import { GroupMessageSummaryItem } from '../../domain/repositories/group-messages-repository'

export class GroupSummaryAgent {
  private readonly client: Groq

  constructor () {
    this.client = new Groq({ apiKey: process.env.GROQ_API_KEY })
  }

  async summarize (messages: GroupMessageSummaryItem[], groupName?: string): Promise<string> {
    const model = process.env.BASIC_MODEL ?? 'llama3-8b-8192'
    const title = groupName != null && groupName.trim().length > 0 ? groupName.trim() : 'grupo'

    const content = messages
      .map((message) => {
        const date = message.sentAt instanceof Date ? message.sentAt : new Date(message.sentAt)
        const time = date.toISOString().replace('T', ' ').slice(0, 16)
        const author = message.senderName ?? (message.fromMe ? 'Eu' : (message.senderId ?? 'Desconhecido'))
        const text = message.content.replace(/\s+/g, ' ').trim().slice(0, 500)
        return `[${time}] ${author}: ${text}`
      })
      .join('\n')

    const completion = await this.client.chat.completions.create({
      model,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente que resume conversas em português do Brasil. Seja direto e claro. Foque em decisões, tópicos recorrentes, dúvidas abertas e próximos passos.'
        },
        {
          role: 'user',
          content: `Faça um resumo das últimas mensagens do ${title}.\n\nMensagens:\n${content}`
        }
      ]
    })

    const output = completion.choices?.[0]?.message?.content?.trim()
    return output != null && output.length > 0 ? output : 'Não consegui gerar o resumo agora.'
  }
}
