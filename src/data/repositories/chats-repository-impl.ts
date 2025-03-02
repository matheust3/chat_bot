import { ChatsRepository } from '../../domain/repositories/chats-repository'
import { ChatsDatasource } from '../datasources/chats-datasource'

export class ChatsRepositoryImpl implements ChatsRepository {
  private readonly _chatsDatasource: ChatsDatasource

  constructor (chatsDatasource: ChatsDatasource) {
    this._chatsDatasource = chatsDatasource
  }

  async addChatToLinksBlackList (chatId: string): Promise<void> {
    await this._chatsDatasource.addChatToLinksBlackList(chatId)
  }

  async getChatsLinksBlackList (): Promise<string[]> {
    return await this._chatsDatasource.getChatsLinksBlackList()
  }
}
