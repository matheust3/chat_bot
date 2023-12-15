import { Message } from 'whatsapp-web.js'
import { ChatData } from '../models/chat-data'

export interface ChatRepository {
  /**
   * Pega o id de um chat (somente eu)
   */
  getChatId: (message: Message) => Promise<string>

  /*
  * Pega os dados de todos os chats que o bot está
  */
  getAllChats: () => Promise<ChatData[]>
}
