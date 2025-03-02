import { ChatsDatasource } from '../../data/datasources/chats-datasource'
import { ChatsRepositoryImpl } from '../../data/repositories/chats-repository-impl'
import { ChatsRepository } from '../../domain/repositories/chats-repository'
import { ChatsDatasourceInstance } from './chats-datasource-instance'

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
class Singleton {
  private static instance: ChatsRepository

  constructor (chatsDatasource: ChatsDatasource) {
    if (Singleton.instance === undefined) {
      Singleton.instance = new ChatsRepositoryImpl(chatsDatasource)
    }
    return Singleton.instance
  }

  static getInstance (): ChatsRepository {
    if (Singleton.instance === undefined) {
      // eslint-disable-next-line no-new
      new Singleton(ChatsDatasourceInstance)
    }
    return Singleton.instance
  }
}

export const ChatsRepositoryInstance = Singleton.getInstance()
