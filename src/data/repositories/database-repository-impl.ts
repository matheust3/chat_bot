import { DatabaseRepository } from '../../domain/repositories/database-repository'
import { AddChatToAuthorizedChatsDatasource } from '../datasources/database/add-chat-to-authorized-chats-datasource'
import { LoadAuthorizedChatsDatasource } from '../datasources/database/load-authorized-chats-datasource'

export class DatabaseRepositoryImpl implements DatabaseRepository {
  private readonly _loadAuthorizedChatsDatasource: LoadAuthorizedChatsDatasource
  private readonly _addChatToAuthorizedChatsDatasource: AddChatToAuthorizedChatsDatasource
  private _authorizedChats: string[]

  constructor (loadAuthorizedChatsDatasource: LoadAuthorizedChatsDatasource,
    addChatToAuthorizedChatsDatasource: AddChatToAuthorizedChatsDatasource
  ) {
    this._loadAuthorizedChatsDatasource = loadAuthorizedChatsDatasource
    this._addChatToAuthorizedChatsDatasource = addChatToAuthorizedChatsDatasource
    this._authorizedChats = this._loadAuthorizedChatsDatasource.load()
  }

  async addChatToAuthorizedChats (chatId: string): Promise<void> {
    await this._addChatToAuthorizedChatsDatasource.addChat(chatId)
    this._authorizedChats = this._loadAuthorizedChatsDatasource.load()
  }

  async isChatAuthorized (chatId: string): Promise<boolean> {
    return this._authorizedChats.includes(chatId)
  }
}
