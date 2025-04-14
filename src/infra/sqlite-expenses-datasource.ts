import { Database } from 'sqlite3'
import { ExpenseFilters, ExpensesDatasource } from '../data/datasources/expenses-datasource'
import { Expense } from '../domain/models/expense'

export class SqliteExpensesDatasource implements ExpensesDatasource {
  private readonly _sqliteDatabase: Database

  constructor (sqliteDatabase: Database) {
    this._sqliteDatabase = sqliteDatabase
  }

  async updateExpense (expense: Expense, userId: string): Promise<Expense> {
    return await new Promise((resolve, reject) => {
      // Primeiro verificar se o gasto pertence ao usuário
      this._sqliteDatabase.get(
        'SELECT id FROM expenses WHERE id = ? AND userId = ?',
        [expense.id, userId],
        (err, row) => {
          if (err != null) {
            reject(err)
            return
          }

          if (row === null || row === undefined) {
            reject(new Error('Gasto não encontrado ou não pertence ao usuário'))
            return
          }

          // Se pertence ao usuário, atualizar
          this._sqliteDatabase.run(
            'UPDATE expenses SET description = ?, amount = ?, date = ?, category = ? WHERE id = ? AND userId = ?',
            [
              expense.description,
              expense.amount,
              expense.date.getTime(),
              expense.category,
              expense.id,
              userId
            ],
            function (updateErr) {
              if (updateErr != null) {
                reject(updateErr)
              }
              resolve(expense)
            }
          )
        }
      )
    })
  }

  async saveExpense (expense: Expense, userId: string): Promise<Expense> {
    return await new Promise((resolve, reject) => {
      this._sqliteDatabase.run(
        'INSERT INTO expenses (id, description, amount, date, category, userId) VALUES (?, ?, ?, ?, ?, ?)',
        [
          expense.id,
          expense.description,
          expense.amount,
          expense.date.getTime(),
          expense.category,
          userId
        ],
        function (err) {
          if (err != null) {
            reject(err)
          }
          resolve(expense)
        }
      )
    })
  }

  async deleteExpense (id: string, userId: string): Promise<void> {
    return await new Promise((resolve, reject) => {
      this._sqliteDatabase.run(
        'DELETE FROM expenses WHERE id = ? AND userId = ?',
        [id, userId],
        function (err) {
          if (err != null) {
            reject(err)
          }

          // Verificar se algo foi deletado
          if (this.changes === 0) {
            reject(new Error('Gasto não encontrado ou não pertence ao usuário'))
            return
          }

          resolve()
        }
      )
    })
  }

  async getExpenses (filters: ExpenseFilters, userId: string): Promise<Expense[]> {
    return await new Promise((resolve, reject) => {
      // Iniciar com a base da query
      let query = 'SELECT * FROM expenses WHERE userId = ?'
      const params: Array<string | number> = [userId] // Começar com userId como primeiro parâmetro

      // Adicionar condições apenas para os filtros que foram fornecidos
      if (filters.category !== undefined && filters.category !== null && filters.category !== '') {
        query += ' AND category = ?'
        params.push(filters.category)
      }

      if (filters.startDate !== undefined && filters.startDate !== null) {
        const startTimestamp = new Date(filters.startDate).getTime()
        query += ' AND date >= ?'
        params.push(startTimestamp)
        console.log('Filtrando por data inicial:', startTimestamp) // Debug
      }

      if (filters.endDate !== undefined && filters.endDate !== null) {
        // Converter para timestamp do final do dia
        const endDate = new Date(filters.endDate)
        endDate.setHours(23, 59, 59, 999) // Final do dia
        const endTimestamp = endDate.getTime()

        query += ' AND date <= ?'
        params.push(endTimestamp)
      }

      if (filters.id !== undefined && filters.id !== null) {
        query += ' AND id = ?'
        params.push(filters.id)
      }

      if (filters.minAmount !== undefined && filters.minAmount !== null) {
        query += ' AND amount >= ?'
        params.push(filters.minAmount)
      }

      if (filters.maxAmount !== undefined && filters.maxAmount !== null) {
        query += ' AND amount <= ?'
        params.push(filters.maxAmount)
      }

      if (filters.description !== undefined && filters.description !== null && filters.description !== '') {
        query += ' AND description LIKE ?'
        params.push(`%${filters.description}%`) // Busca parcial
      }

      this._sqliteDatabase.all(query, params,
        (err: Error | null, rows: Array<{ id: string, description: string, amount: number, date: string, category: string, userId: string }>) => {
          if (err != null) {
            console.error('Erro na consulta SQL:', err) // Debug
            reject(err)
          }
          try {
            const expenses = rows.map(row => ({
              id: row.id,
              description: row.description,
              amount: row.amount,
              date: new Date(row.date),
              category: row.category
            }))
            console.log(`Encontrados ${expenses.length} gastos`) // Debug
            resolve(expenses)
          } catch (err) {
            console.error('Erro ao mapear resultado:', err) // Debug
            reject(err)
          }
        }
      )
    })
  }

  async createTables (): Promise<void> {
    return await new Promise((resolve, reject) => {
      this._sqliteDatabase.run(
        'CREATE TABLE IF NOT EXISTS expenses (id TEXT PRIMARY KEY, description TEXT, amount REAL, date INTEGER, category TEXT, userId TEXT)',
        (err) => {
          if (err != null) {
            reject(err)
          }
          resolve()
        }
      )
    })
  }
}
