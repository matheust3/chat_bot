import { Message } from 'whatsapp-web.js'
import { ChatRepository } from '../../domain/repositories/chat-repository'
import { ClientDataSource } from '../datasources/client-datasource'
import { ChatData } from '../../domain/models/chat-data'

export class ChatRepositoryImpl implements ChatRepository {
  constructor (private readonly _client: ClientDataSource) {}

  async getChatId (message: Message): Promise<string> {
    const chat = await message.getChat()
    return chat.id._serialized
  }

  async getAllChats (): Promise<ChatData[]> {
    return await this._client.getAllChats()
  }
}
