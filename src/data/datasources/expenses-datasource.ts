import { Expense } from "../../domain/models/expense";


// Interface para os filtros de despesas
export interface ExpenseFilters {
  category?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  description?: string;
}

export interface ExpensesDatasource {
  saveExpense: (expense: Expense ) => Promise<Expense>
  deleteExpense: (id: string) => Promise<void>
  getExpenses: (filters: ExpenseFilters) => Promise<Expense[]>
}