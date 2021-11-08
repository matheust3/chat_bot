import { Message } from 'whatsapp-web.js'

export interface AntiSpamRepository{
  /**
   * Verifica se a mensagem eh spam
   * @param Mensagem
   * @returns Returna true se for spam e false se nao for
   */
  checkMessage: (message: Message) => Promise<boolean>
}
