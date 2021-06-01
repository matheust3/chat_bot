import { Message } from 'whatsapp-web.js'
import { ChatRepository } from '../../domain/repositories/chat-repository'

export class ChatRepositoryImpl implements ChatRepository {
  async getChatId (message: Message): Promise<string> {
    const chat = await message.getChat()
    return chat.id._serialized
  }
}
