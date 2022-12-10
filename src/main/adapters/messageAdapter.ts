import { Message } from 'whatsapp-web.js'
import { IMessage } from '../protocols/IMessage'

export const messageAdapter = (message: Message): IMessage => {
  return {
    body: message.body,
    isCommand: message.body.startsWith('#'),
    reply: async (body: string): Promise<IMessage> => {
      const response = await message.reply(body)
      return messageAdapter(response)
    }
  }
}
