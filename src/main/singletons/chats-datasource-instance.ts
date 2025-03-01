import { Database } from 'sqlite3'
import { ChatsDatasource } from '../../data/datasources/chats-datasource'
import { ChatsDatasourceImpl } from '../../infra/chats-datasource-impl'

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
class Singleton {
  private static instance: ChatsDatasource

  constructor (database: Database) {
    if (Singleton.instance !== undefined) {
      Singleton.instance = new ChatsDatasourceImpl(database)
    }
    return Singleton.instance
  }

  static getInstance (): ChatsDatasource {
    if (Singleton.instance === undefined) {
      // eslint-disable-next-line no-new
      new Singleton(new Database('../../../database-files/chats.db'))
    }
    return Singleton.instance
  }
}

export const ChatsDatasourceInstance = Singleton.getInstance()
