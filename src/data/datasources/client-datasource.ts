import { ChatData } from '../../domain/models/chat-data'

export interface ClientDataSource {
  /**
  * Pega os dados de todos os chats que o bot está
  */
  getAllChats: () => Promise<ChatData[]>
}
