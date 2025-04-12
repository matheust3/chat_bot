import { Database } from "sqlite3"
import { ExpenseFilters, ExpensesDatasource } from "../data/datasources/expenses-datasource"
import { Expense } from "../domain/models/expense"

export class SqliteExpensesDatasource implements ExpensesDatasource {
  private _sqliteDatabase: Database

  constructor(sqliteDatabase: any) {
    this._sqliteDatabase = sqliteDatabase
  }
  async updateExpense(expense: Expense): Promise<Expense> {
    return await new Promise((resolve, reject) => {
      this._sqliteDatabase.run('UPDATE expenses SET description = ?, amount = ?, date = ?, category = ? WHERE id = ?', [expense.description, expense.amount, expense.date.getTime(), expense.category, expense.id], function (err) {
        if (err != null) {
          reject(err)
        }
        resolve(expense)
      })
    })
  }


  async saveExpense(expense: Expense): Promise<Expense> {
    return await new Promise((resolve, reject) => {
      this._sqliteDatabase.run('INSERT INTO expenses (id, description, amount, date, category) VALUES (?, ?, ?, ?, ?)', [expense.id, expense.description, expense.amount, expense.date.getTime(), expense.category], function (err) {
        if (err != null) {
          reject(err)
        }
        resolve(expense)
      })
    })
  }

  async deleteExpense(id: string): Promise<void> {
    return await new Promise((resolve, reject) => {
      this._sqliteDatabase.run('DELETE FROM expenses WHERE id = ?', [id], function (err) {
        if (err != null) {
          reject(err)
        }
        resolve()
      })
    })
  }


  async getExpenses(filters: ExpenseFilters): Promise<Expense[]> {
    return await new Promise((resolve, reject) => {
      // Iniciar com a base da query
      let query = 'SELECT * FROM expenses WHERE 1=1';
      const params: any[] = [];
      
      // Adicionar condições apenas para os filtros que foram fornecidos
      if (filters.category) {
        query += ' AND category = ?';
        params.push(filters.category);
      }
      
      if (filters.startDate) {
        const startTimestamp = new Date(filters.startDate).getTime();
        query += ' AND date >= ?';
        params.push(startTimestamp);
        console.log("Filtrando por data inicial:", startTimestamp); // Debug
      }
      
      if (filters.endDate) {
        // Converter para ISO se for um objeto Date
        const endTimestamp = new Date(filters.endDate).getTime();
        query += ' AND date <= ?';
        params.push(endTimestamp);
        console.log("Filtrando por data final:", endTimestamp); // Debug
      }
      
      if (filters.id !== undefined  && filters.id !== null) {
        query += ' AND id = ?';
        params.push(filters.id);
      }
      
      if (filters.minAmount !== undefined && filters.minAmount !== null) {
        query += ' AND amount >= ?';
        params.push(filters.minAmount);
      }
      
      if (filters.maxAmount !== undefined && filters.maxAmount !== null) {
        query += ' AND amount <= ?';
        params.push(filters.maxAmount);
      }
      
      if (filters.description && filters.description !== null) {
        query += ' AND description LIKE ?';
        params.push(`%${filters.description}%`); // Busca parcial
      }
      
      console.log("Query SQL:", query); // Debug
      console.log("Parâmetros:", params); // Debug
      
      this._sqliteDatabase.all(query, params, 
        (err: Error | null, rows: Array<{ id: string, description: string, amount: number, date: string, category: string }>) => {
          if (err != null) {
            console.error("Erro na consulta SQL:", err); // Debug
            reject(err);
          }
          try {
            const expenses = rows.map(row => ({
              id: row.id,
              description: row.description,
              amount: row.amount,
              date: new Date(row.date),
              category: row.category
            }));
            console.log(`Encontrados ${expenses.length} gastos`); // Debug
            resolve(expenses);
          } catch (err) {
            console.error("Erro ao mapear resultado:", err); // Debug
            reject(err);
          }
        }
      );
    });
  }

  async createTables(): Promise<void> {
    return await new Promise((resolve, reject) => {
      this._sqliteDatabase.run('CREATE TABLE IF NOT EXISTS expenses (id TEXT PRIMARY KEY, description TEXT, amount REAL, date INTEGER, category TEXT)', (err) => {
        if (err != null) {
          reject(err)
        }
        resolve()
      })
    })
  }

}