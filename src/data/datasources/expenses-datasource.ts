import { Expense } from '../../domain/models/expense'

// Interface para os filtros de despesas
export interface ExpenseFilters {
  id?: string | null
  category?: string | null
  startDate?: Date | string | null // Permitir ambos os tipos
  endDate?: Date | string | null // Permitir ambos os tipos
  minAmount?: number | null
  maxAmount?: number | null
  description?: string | null
}

export interface ExpensesDatasource {
  saveExpense: (expense: Expense, userId: string) => Promise<Expense>
  deleteExpense: (id: string, userId: string) => Promise<void>
  getExpenses: (filters: ExpenseFilters, userId: string) => Promise<Expense[]>
  updateExpense: (expense: Expense, userId: string) => Promise<Expense>
  createTables: () => Promise<void>
}
