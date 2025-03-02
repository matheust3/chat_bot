export interface ChatsDatasource {
  addChatToLinksBlackList: (chatId: string) => Promise<void>
  close: () => Promise<void>
  getChatsLinksBlackList: () => Promise<string[]>
}
