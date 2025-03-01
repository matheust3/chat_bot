export interface ChatsRepository {
  /**
   * Adiciona um chat a uma lista de chats onde os links não são permitidos
   * @param chatId Id do chat
   */
  addChatToLinksBlackList: (chatId: string) => Promise<void>

  /**
   * Retorna a lista de chats onde os links não são permitidos
   * @returns Lista de chats
   */
  getChatsLinksBlackList: () => Promise<string[]>
}
