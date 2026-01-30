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
  /**
   * Retorna o nome do contato
   *
   * @param contactId Id do contato
   */
  getContactName: (contactId: string) => Promise<string | undefined>
  /**
   * Retorna o nome do chat (grupo ou contato)
   *
   * @param chatId Id do chat
   */
  getChatName: (chatId: string) => Promise<string | undefined>
  getGroupInviteLink: (chatId: string) => Promise<string>
  getNumberId: (phone: string) => Promise<string | undefined>
  getPnLidEntry: (phoneOrLid: string) => Promise<{ lid?: { _serialized?: string }, phoneNumber?: { _serialized?: string } } | undefined>
  sendImageAsSticker: (to: string, pathOrBase64: string, type: 'static' | 'animated', op?: { quotedMsg: string }) => Promise<void>
  sendText: (to: string, content: string, op?: { quotedMsg: string }) => Promise<string>
}
