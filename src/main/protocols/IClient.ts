export interface IClient {
  /**
   * Bane um usuário de um grupo
   */
  ban: (chatId: string, contactId: string) => Promise<void>
  /**
   * Indica se o bot é admin do grupo
   */
  botIsAdmin: (groupId: string) => Promise<boolean>
  /**
   * Deleta uma mensagem
   *
   * @param chatId Id do chat
   * @param messageId Id da mensagem
   */
  deleteMessage: (chatId: string, messageId: string) => Promise<void>
  /**
   * Faz o download de um arquivo
   *
   * @param messageId Id da mensagem
   * @returns Buffer do arquivo
   */
  downloadFile: (messageId: string) => Promise<Buffer>
  getGroupInviteLink: (chatId: string) => Promise<string>
  sendImageAsSticker: (to: string, pathOrBase64: string, type: 'static' | 'animated', op?: { quotedMsg: string }) => Promise<void>
  sendText: (to: string, content: string, op?: { quotedMsg: string }) => Promise<string>
}
