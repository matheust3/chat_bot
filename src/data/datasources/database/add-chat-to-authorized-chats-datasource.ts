export interface AddChatToAuthorizedChatsDatasource {
  /**
   * Add chat to authorized chats
   *
   * @param chatId Id do chat
   */
  addChat: (chatId: string) => Promise<void>
}
