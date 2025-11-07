import { IAAgent } from '../../domain/services/ai-agent'
import { IClient } from '../protocols/IClient'
import { IMessage } from '../protocols/IMessage'
import { GroqAiAgent } from '../../data/services/groq-ai-agent'
import { Database } from 'sqlite3'
import path from 'path'
import { SqliteExpensesDatasource } from '../../infra/sqlite-expenses-datasource'
import { SubscriptionsRepositoryImpl } from '../../data/repositories/subscriptions-repository'
import { PaymentService } from '../../domain/services/payment-service'
import { PagarmeService } from '../../data/services/pagarme-service'
import { SQLiteSubscriptionDatasource } from '../../infra/sqlite-subscription-datasource'
import { DemoAgentImpl } from '../../data/services/demo-agent-impl'

const db = new Database(path.join(__dirname, '../../../database-files/expenses.db'))
const expanseDb = new SqliteExpensesDatasource(db)
const aiAgent: IAAgent = new GroqAiAgent(expanseDb)
let tablesCreated = false

const subscriptionDatabase = new Database(path.join(__dirname, '../../../database-files/subscriptions.db'))
const subscriptionDatasource = new SQLiteSubscriptionDatasource(subscriptionDatabase)
const paymentService: PaymentService = new PagarmeService(subscriptionDatasource)
const subscriptionsRepository = new SubscriptionsRepositoryImpl(paymentService)

const demoAgent = new DemoAgentImpl(aiAgent, subscriptionsRepository)

export default async (message: IMessage, client: IClient, next: () => void): Promise<void> => {
  if (!message.isCommand && !message.fromMe && message.groupId === undefined && message.body.trim().length > 0) {
    const userId = message.sender
    if (!tablesCreated) {
      await expanseDb.createTables()
      tablesCreated = true
    }

    const isSubscribed = await subscriptionsRepository.getSubscriptionStatus(userId)
    if (!isSubscribed) {
      const response = await demoAgent.handleMessage(message.body, userId)
      await client.sendText(message.chatId, response)
    } else {
      const response = await aiAgent.handleMessage(message.body, userId)
      await client.sendText(message.chatId, response)
    }
  } else {
    next()
  }
}
