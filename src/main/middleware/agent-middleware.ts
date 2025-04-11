import { AiAgentImpl } from '../../data/services/ai-agent-impl'
import { IAAgent } from '../../domain/services/ai-agent'
import { IClient } from '../protocols/IClient'
import { IMessage } from '../protocols/IMessage'

const iaAgent: IAAgent = new AiAgentImpl()

export default async (message: IMessage, client: IClient, next: () => void): Promise<void> => {
  if(message.fromMe && message.chatId === '556599216704@c.us') {
    const response = await iaAgent.handleMessage(message.body)
    await client.sendText(message.chatId, response, { quotedMsg: message.id })
  }else{
    next()
  }
}