import { Expense } from "../../domain/models/expense";


// Interface para os filtros de despesas
export interface ExpenseFilters {
  id?: string;
  category?: string;
  startDate?: Date | string;  // Permitir ambos os tipos
  endDate?: Date | string;    // Permitir ambos os tipos
  minAmount?: number;
  maxAmount?: number;
  description?: string;
}

export interface ExpensesDatasource {
  saveExpense: (expense: Expense ) => Promise<Expense>
  deleteExpense: (id: string) => Promise<void>
  getExpenses: (filters: ExpenseFilters) => Promise<Expense[]>
  updateExpense: (expense: Expense) => Promise<Expense> 
}