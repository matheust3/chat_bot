import { Database } from 'sqlite3'
import { ChatsDatasource } from '../../data/datasources/chats-datasource'
import { ChatsDatasourceImpl } from '../../infra/chats-datasource-impl'
import path from 'path'

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
class Singleton {
  private static instance: ChatsDatasource

  constructor (database: Database) {
    if (Singleton.instance === undefined) {
      const impl = new ChatsDatasourceImpl(database)
      Singleton.instance = impl
      // create tables asynchronously and surface any errors to the console
      // we don't await here so getInstance remains synchronous
      impl.createTables().catch((err) => {
        // eslint-disable-next-line no-console
        console.error('Erro ao criar as tabelas no datasource', err)
      })
    }
    return Singleton.instance
  }

  static getInstance (): ChatsDatasource {
    if (Singleton.instance === undefined) {
      // eslint-disable-next-line no-new
      new Singleton(new Database(path.join(__dirname, '../../../database-files/chats.db')))
    }
    return Singleton.instance
  }
}

export const ChatsDatasourceInstance = Singleton.getInstance()
