import { Message } from 'whatsapp-web.js'

export interface BanRepository{
  /**
   * Bane um usuario
   * @param mensagem que motivou banimento
   * @param log Motivo do banimento que ficara nos logs
   */
  ban: (message: Message, log: string) => Promise<void>

  /**
   * Faz um banimento por um adm
   * @param message mensagem que motivou o banimento '#ban' (dentro dessa mensagem existe uma outra mensagem da pessoa que sera banida)
   */
  adminBan: (message: Message) => Promise<void>

  /**
   * Retorna os logs de ban de uma conversa ou grupo
   */
  getLogs: (message: Message) => Promise<void>
}
