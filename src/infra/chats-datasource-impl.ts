import { ChatsDatasource } from '../data/datasources/chats-datasource'
import { Database } from 'sqlite3'

export class ChatsDatasourceImpl implements ChatsDatasource {
  private readonly _sqliteDatabase: Database

  constructor (sqliteDatabase: Database) {
    this._sqliteDatabase = sqliteDatabase
  }

  async createTables (): Promise<void> {
    return await new Promise((resolve, reject) => {
      this._sqliteDatabase.run('CREATE TABLE IF NOT EXISTS chats_links_blacklist (id INTEGER PRIMARY KEY AUTOINCREMENT, chatId TEXT UNIQUE)', (err) => {
        if (err != null) {
          reject(err)
        }
        resolve()
      })
    })
  }

  async addChatToLinksBlackList (chatId: string): Promise<void> {
    this._sqliteDatabase.run('INSERT INTO chats_links_blacklist (chatId) VALUES (?)', chatId)
  }

  async getChatsLinksBlackList (): Promise<string[]> {
    return await new Promise((resolve, reject) => {
      this._sqliteDatabase.all('SELECT chatId FROM chats_links_blacklist', (err, rows: Array<{ chatId: string }>) => {
        if (err != null) {
          reject(err)
        }
        resolve(rows.map(row => row.chatId))
      })
    })
  }
}
