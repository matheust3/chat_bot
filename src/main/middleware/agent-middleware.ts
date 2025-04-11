import { IAAgent } from '../../domain/services/ai-agent'
import { IClient } from '../protocols/IClient'
import { IMessage } from '../protocols/IMessage'
import {GroqAiAgent} from '../../data/services/groq-ai-agent'

const aiAgent: IAAgent = new GroqAiAgent()

export default async (message: IMessage, client: IClient, next: () => void): Promise<void> => {
  if(!message.fromMe && message.chatId === '556592203136@c.us' && message.body.trim().length > 0 ) {
    const response = await aiAgent.handleMessage(message.body)
    await client.sendText(message.chatId, response)
  }else{
    next()
  }
}