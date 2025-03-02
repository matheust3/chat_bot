import { Database } from 'sqlite3'
import { ChatsDatasourceImpl } from './chats-datasource-impl'

describe('chats-datasource-impl.spec.ts - addChatToLinksBlackList', () => {
  let sqliteDatabase: Database
  let chatsDatasourceImpl: ChatsDatasourceImpl

  beforeEach(async () => {
    sqliteDatabase = new Database(':memory:')
    chatsDatasourceImpl = new ChatsDatasourceImpl(sqliteDatabase)
    await chatsDatasourceImpl.createTables()
  })

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      sqliteDatabase.close((err) => {
        if (err != null) {
          reject(err)
        }
        resolve()
      })
    })
  })

  test('ensure check if table exists', async () => {
    //! Arrange
    //! Act - Assert
    sqliteDatabase.all('SELECT name FROM sqlite_master WHERE (name=\'chats_links_blacklist\')', (err, rows) => {
      expect(err).toBeNull()
      expect(rows).toBeDefined()
      expect(rows).toHaveLength(1)
    })
  })

  test('ensure add chat to blacklist', async () => {
    //! Arrange
    const chatId = 'chatId'
    //! Act
    await chatsDatasourceImpl.addChatToLinksBlackList(chatId)
    //! Assert
    sqliteDatabase.all('SELECT chatId FROM chats_links_blacklist WHERE chatId = ?', chatId, (err, rows: Array<{ chatId: string }>) => {
      expect(err).toBeNull()
      expect(rows).toBeDefined()
      expect(rows).toHaveLength(1)
      expect(rows[0].chatId).toBe(chatId)
    })
  })
})

describe('chats-datasource-impl.spec.ts - getChatsLinksBlackList', () => {
  let sqliteDatabase: Database
  let chatsDatasourceImpl: ChatsDatasourceImpl

  beforeEach(async () => {
    sqliteDatabase = new Database(':memory:')
    chatsDatasourceImpl = new ChatsDatasourceImpl(sqliteDatabase)
    await chatsDatasourceImpl.createTables()
  })

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      sqliteDatabase.close((err) => {
        if (err != null) {
          reject(err)
        }
        resolve()
      })
    })
  })

  test('ensure check if table exists', async () => {
    //! Arrange
    //! Act - Assert
    sqliteDatabase.all('SELECT name FROM sqlite_master WHERE (name=\'chats_links_blacklist\')', (err, rows) => {
      expect(err).toBeNull()
      expect(rows).toBeDefined()
      expect(rows).toHaveLength(1)
    })
  })

  test('ensure get chats links blacklist', async () => {
    //! Arrange
    const chatId = 'chatId'
    await chatsDatasourceImpl.addChatToLinksBlackList(chatId)
    //! Act
    const result = await chatsDatasourceImpl.getChatsLinksBlackList()
    //! Assert
    expect(result).toBeDefined()
    expect(result).toHaveLength(1)
    expect(result[0]).toBe(chatId)
  })
})
