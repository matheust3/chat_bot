export interface ChatsDatasource {
  addChatToLinksBlackList: (chatId: string) => Promise<void>
  getChatsLinksBlackList: () => Promise<string[]>
}
