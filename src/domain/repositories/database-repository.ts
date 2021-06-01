
export interface DatabaseRepository{
  /**
   * Adiciona um chat a lista de chats autorizadas a usar o bot
   *
   * @param chatId Id do chat
   */
  addChatToAuthorizedChats: (chatId: string) => Promise<void>
  /**
   * Verifica se o chat esta autorizado a usar o bot
   */
  isChatAuthorized: (chatId: string) => Promise<boolean>
}
