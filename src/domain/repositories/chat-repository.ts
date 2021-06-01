import { Message } from 'whatsapp-web.js'

export interface ChatRepository{
  /**
   * Pega o id de um chat (somente eu)
   */
  getChatId: (message: Message) => Promise<string>
}
