import { Database } from "sqlite3"
import { ExpenseFilters, ExpensesDatasource } from "../data/datasources/expenses-datasource"
import { Expense } from "../domain/models/expense"

export class SqliteExpensesDatasource implements ExpensesDatasource {
  private _sqliteDatabase: Database

  constructor (sqliteDatabase: any) {
    this._sqliteDatabase = sqliteDatabase
  }


  async saveExpense (expense: Expense) : Promise<Expense>{
    return await new Promise((resolve, reject) => {
      this._sqliteDatabase.run('INSERT INTO expenses (id, description, amount, date, category) VALUES (?, ?, ?, ?, ?)', [expense.id, expense.description, expense.amount, expense.date.toISOString(), expense.category], function (err) {
        if (err != null) {
          reject(err)
        }
        resolve(expense)
      })
    })
  }

  async deleteExpense (id: string) : Promise<void>{
    return await new Promise((resolve, reject) => {
      this._sqliteDatabase.run('DELETE FROM expenses WHERE id = ?', [id], function (err) {
        if (err != null) {
          reject(err)
        }
        resolve()
      })
    })
  }


  async getExpenses (filters: ExpenseFilters) : Promise<Expense[]>{
    return await new Promise((resolve, reject) => {
      const query = 'SELECT * FROM expenses WHERE (category = ? OR ? IS NULL) AND (date >= ? OR ? IS NULL) AND (date <= ? OR ? IS NULL)'
      this._sqliteDatabase.all(query, [filters.category, filters.category, filters.startDate, filters.startDate, filters.endDate, filters.endDate], (err: Error | null, rows: Array<{ id: string, description: string, amount: number, date: string, category: string }>) => {
        if (err != null) {
          reject(err)
        }
        try {
          resolve(rows.map(row => ({
            id: row.id,
            description: row.description,
            amount: row.amount,
            date: new Date(row.date),
            category: row.category
          })))
        } catch (err) {
          reject(err)
        }
      })
    })
  }

  async createTables (): Promise<void> {
    return await new Promise((resolve, reject) => {
      this._sqliteDatabase.run('CREATE TABLE IF NOT EXISTS expenses (id TEXT PRIMARY KEY, description TEXT, amount REAL, date TEXT, category TEXT)', (err) => {
        if (err != null) {
          reject(err)
        }
        resolve()
      })
    })
  }

}