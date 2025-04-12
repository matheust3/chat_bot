import { IAAgent } from '../../domain/services/ai-agent'
import { IClient } from '../protocols/IClient'
import { IMessage } from '../protocols/IMessage'
import { GroqAiAgent } from '../../data/services/groq-ai-agent'
import { Database } from 'sqlite3'
import path from 'path'
import { SqliteExpensesDatasource } from '../../infra/sqlite-expenses-datasource'


const db = new Database(path.join(__dirname, '../../../database-files/expenses.db'))
const expanseDb = new SqliteExpensesDatasource(db)
const aiAgent: IAAgent = new GroqAiAgent(expanseDb)
let tablesCreated = false

export default async (message: IMessage, client: IClient, next: () => void): Promise<void> => {
  if (!message.fromMe && message.chatId === '556592203136@c.us' && message.body.trim().length > 0) {
    if(!tablesCreated) {
      await expanseDb.createTables()
      tablesCreated = true
    }
    const response = await aiAgent.handleMessage(message.body)
    await client.sendText(message.chatId, response)
  } else {
    next()
  }
}