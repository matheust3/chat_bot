import { ChatData } from '../../domain/models/chat-data'

export interface IClientDataSource {
  /**
  * Pega os dados de todos os chats que o bot está
  */
  getAllChats: () => Promise<ChatData[]>
}
