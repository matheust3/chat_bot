import { ExpensesDatasource, ExpenseFilters } from '../datasources/expenses-datasource'
import { Expense } from '../../domain/models/expense'

export class ExpenseManager {
  private readonly expenseDb: ExpensesDatasource

  constructor (db: ExpensesDatasource) {
    this.expenseDb = db
  }

  async addExpense (expenseData: Partial<Expense>, userId: string): Promise<Expense> {
    const expense: Expense = {
      amount: isNaN(Number(expenseData.amount)) ? 0 : Number(expenseData.amount),
      description: (expenseData.description ?? '').toLowerCase(),
      date: (expenseData.date != null) ? new Date(expenseData.date) : new Date(),
      category: (expenseData.category != null) ? expenseData.category.toLowerCase() : 'outros',
      id: new Date().toISOString() + Math.random().toString(36).substring(2, 15)
    }
    return await this.expenseDb.saveExpense(expense, userId)
  }

  async editExpense (expenseId: string, updates: Partial<Expense>, userId: string): Promise<Expense | null> {
    const recentExpenses = await this.getRecentExpenses(userId)
    const expenseToEdit = recentExpenses.find(expense => expense.id === expenseId)
    if (expenseToEdit == null) return null

    const updatedExpense: Expense = {
      ...expenseToEdit,
      description: updates.description?.toLowerCase() ?? expenseToEdit.description,
      amount: updates.amount !== undefined ? Number(updates.amount) : expenseToEdit.amount,
      category: updates.category?.toLowerCase() ?? expenseToEdit.category,
      date: (updates.date != null) ? new Date(updates.date) : expenseToEdit.date
    }

    return await this.expenseDb.updateExpense(updatedExpense, userId)
  }

  async getExpenses (filters: Partial<ExpenseFilters>, userId: string): Promise<Expense[]> {
    return await this.expenseDb.getExpenses(filters, userId)
  }

  async getRecentExpenses (userId: string): Promise<Expense[]> {
    const today = new Date()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(today.getDate() - 30)
    return await this.expenseDb.getExpenses({ startDate: thirtyDaysAgo, endDate: today }, userId)
  }
}
