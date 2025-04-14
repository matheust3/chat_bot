/* eslint-disable @typescript-eslint/no-explicit-any */
import { Database } from 'sqlite3'
import { SubscriptionDatasource } from '../data/datasources/subscriptions-datasource'
import { PaymentIntent, Subscription } from '../domain/services/payment-service'

export class SQLiteSubscriptionDatasource implements SubscriptionDatasource {
  private readonly _sqliteDatabase: Database

  constructor (sqliteDatabase: Database) {
    this._sqliteDatabase = sqliteDatabase
    this.initialize()
  }

  private initialize (): void {
    // Create tables if they don't exist
    this._sqliteDatabase.exec(`
      CREATE TABLE IF NOT EXISTS payment_intents (
        id TEXT PRIMARY KEY,
        link TEXT NOT NULL,
        userId TEXT NOT NULL,
        code TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        status TEXT NOT NULL,
        code TEXT NOT NULL,
        nextPaymentDate INTEGER NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_payment_intents_code ON payment_intents(code);
      CREATE INDEX IF NOT EXISTS idx_payment_intents_userId ON payment_intents(userId);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_code ON subscriptions(code);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_userId ON subscriptions(userId);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
    `, (err) => {
      if (err != null) console.error('Error initializing database:', err)
    })
  }

  // Helper functions to work with promises instead of callbacks
  private async run (sql: string, params: any[]): Promise<void> {
    return await new Promise((resolve, reject) => {
      this._sqliteDatabase.run(sql, params, function (err) {
        if (err != null) reject(err)
        else resolve()
      })
    })
  }

  private async get<T>(sql: string, params: any[]): Promise<T | null> {
    return await new Promise((resolve, reject) => {
      this._sqliteDatabase.get(sql, params, (err, row) => {
        if (err != null) reject(err)
        else resolve(row != null ? row as T : null)
      })
    })
  }

  private async all<T>(sql: string, params: any[]): Promise<T[]> {
    return await new Promise((resolve, reject) => {
      this._sqliteDatabase.all(sql, params, (err, rows) => {
        if (err != null) reject(err)
        else resolve(rows as T[])
      })
    })
  }

  // PaymentIntent CRUD operations
  async createPaymentIntent (paymentIntent: PaymentIntent): Promise<PaymentIntent> {
    const { id, link, userId, code } = paymentIntent
    await this.run(
      'INSERT INTO payment_intents (id, link, userId, code) VALUES (?, ?, ?, ?)',
      [id, link, userId, code]
    )
    return paymentIntent
  }

  async getPaymentIntent (id: string): Promise<PaymentIntent | null> {
    return await this.get<PaymentIntent>(
      'SELECT * FROM payment_intents WHERE id = ?',
      [id]
    )
  }

  async getPaymentIntentByCode (code: string): Promise<PaymentIntent | null> {
    return await this.get<PaymentIntent>(
      'SELECT * FROM payment_intents WHERE code = ?',
      [code]
    )
  }

  async getPaymentIntentsByUserId (userId: string): Promise<PaymentIntent[]> {
    return await this.all<PaymentIntent>(
      'SELECT * FROM payment_intents WHERE userId = ?',
      [userId]
    )
  }

  async updatePaymentIntent (id: string, updates: Partial<PaymentIntent>): Promise<PaymentIntent | null> {
    const current = await this.getPaymentIntent(id)
    if (current == null) return null

    const updateFields: string[] = []
    const values: any[] = []

    if (updates.link !== undefined) {
      updateFields.push('link = ?')
      values.push(updates.link)
    }
    if (updates.userId !== undefined) {
      updateFields.push('userId = ?')
      values.push(updates.userId)
    }
    if (updates.code !== undefined) {
      updateFields.push('code = ?')
      values.push(updates.code)
    }

    if (updateFields.length === 0) return current

    values.push(id)
    await this.run(
      `UPDATE payment_intents SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    )

    return await this.getPaymentIntent(id)
  }

  async deletePaymentIntent (id: string): Promise<boolean> {
    const current = await this.getPaymentIntent(id)
    if (current == null) return false

    await this.run(
      'DELETE FROM payment_intents WHERE id = ?',
      [id]
    )
    return true
  }

  // Subscription CRUD operations
  async createSubscription (subscription: Subscription): Promise<Subscription> {
    const { id, userId, status, code, nextPaymentDate } = subscription
    const nextPaymentTimestamp = nextPaymentDate.getTime()

    await this.run(
      'INSERT INTO subscriptions (id, userId, status, code, nextPaymentDate) VALUES (?, ?, ?, ?, ?)',
      [id, userId, status, code, nextPaymentTimestamp]
    )
    return subscription
  }

  async getSubscription (id: string): Promise<Subscription | null> {
    const sub = await this.get<any>(
      'SELECT * FROM subscriptions WHERE id = ?',
      [id]
    )

    if (sub === null || sub === undefined) return null

    return {
      ...sub,
      nextPaymentDate: new Date(sub.nextPaymentDate)
    }
  }

  async getSubscriptionByCode (code: string): Promise<Subscription | null> {
    const sub = await this.get<any>(
      'SELECT * FROM subscriptions WHERE code = ?',
      [code]
    )

    if (sub === undefined || sub === null) return null

    return {
      ...sub,
      nextPaymentDate: new Date(sub.nextPaymentDate)
    }
  }

  async getActiveSubscriptionByUserId (userId: string): Promise<Subscription | null> {
    const sub = await this.get<any>(
      'SELECT * FROM subscriptions WHERE userId = ? AND status = ?',
      [userId, 'active']
    )

    if (sub === undefined || sub === null) return null

    return {
      ...sub,
      nextPaymentDate: new Date(sub.nextPaymentDate)
    }
  }

  async getAllSubscriptionsByUserId (userId: string): Promise<Subscription[]> {
    const subs = await this.all<any>(
      'SELECT * FROM subscriptions WHERE userId = ?',
      [userId]
    )

    return subs.map(sub => ({
      ...sub,
      nextPaymentDate: new Date(sub.nextPaymentDate)
    }))
  }

  async updateSubscription (id: string, updates: Partial<Subscription>): Promise<Subscription | null> {
    const current = await this.getSubscription(id)
    if (current == null) return null

    const updateFields: string[] = []
    const values: any[] = []

    if (updates.userId !== undefined) {
      updateFields.push('userId = ?')
      values.push(updates.userId)
    }
    if (updates.status !== undefined) {
      updateFields.push('status = ?')
      values.push(updates.status)
    }
    if (updates.code !== undefined) {
      updateFields.push('code = ?')
      values.push(updates.code)
    }
    if (updates.nextPaymentDate !== undefined) {
      updateFields.push('nextPaymentDate = ?')
      values.push(updates.nextPaymentDate.getTime())
    }

    if (updateFields.length === 0) return current

    values.push(id)
    await this.run(
      `UPDATE subscriptions SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    )

    return await this.getSubscription(id)
  }

  async deleteSubscription (id: string): Promise<boolean> {
    const current = await this.getSubscription(id)
    if (current == null) return false

    await this.run(
      'DELETE FROM subscriptions WHERE id = ?',
      [id]
    )
    return true
  }
}
