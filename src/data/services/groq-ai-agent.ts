import { IAAgent } from '../../domain/services/ai-agent'
import Groq from 'groq-sdk'
import { ExpensesDatasource } from '../datasources/expenses-datasource'
import { IntentClassifier } from './intent-classifier'
import { ExpenseDataExtractor } from './expense-data-extractor'
import { ExpenseQueryExtractor } from './expense-query-extractor'
import { ExpenseManager } from './expense-manager'
import { ResponseFormatter } from './response-formatter'
import { Expense } from '../../domain/models/expense'

export class GroqAiAgent implements IAAgent {
  private readonly intentClassifier: IntentClassifier
  private readonly expenseDataExtractor: ExpenseDataExtractor
  private readonly expenseQueryExtractor: ExpenseQueryExtractor
  private readonly expenseManager: ExpenseManager
  private readonly responseFormatter: ResponseFormatter

  constructor (db: ExpensesDatasource) {
    const client = new Groq({ apiKey: process.env.GROQ_API_KEY })
    this.intentClassifier = new IntentClassifier(client)
    this.expenseDataExtractor = new ExpenseDataExtractor(client)
    this.expenseQueryExtractor = new ExpenseQueryExtractor(client)
    this.expenseManager = new ExpenseManager(db)
    this.responseFormatter = new ResponseFormatter()
  }

  async handleMessage (message: string, userId: string): Promise<string> {
    const intent = await this.intentClassifier.classifyIntent(message)
    console.log('Intenção detectada:', intent)

    if (intent === 'ADD_EXPENSE') {
      const expenseData = await this.expenseDataExtractor.extractAddExpenseData(message)
      if ((expenseData.description != null) && (expenseData.amount != null)) {
        const expense = await this.expenseManager.addExpense(expenseData, userId)
        return this.responseFormatter.formatAddExpenseResponse(expense)
      }
      return 'Não consegui entender os detalhes do gasto. Tente ser mais específico.'
    }

    if (intent === 'EDIT_EXPENSE') {
      const recentExpenses = await this.expenseManager.getRecentExpenses(userId)
      const context = this.buildRecentExpensesContext(recentExpenses)
      const editData = await this.expenseDataExtractor.extractEditExpenseData(message, context)

      if ((editData.expenseId != null) && (editData.updates != null) && Object.keys(editData.updates).length > 0) {
        const updatedExpense = await this.expenseManager.editExpense(editData.expenseId, editData.updates, userId)
        if (updatedExpense != null) {
          const original = recentExpenses.find(exp => exp.id === editData.expenseId)
          if (original == null) {
            return `Não foi possível encontrar o gasto original com o ID "${editData.expenseId}". Por favor, verifique o ID e tente novamente.`
          }
          return this.responseFormatter.formatEditExpenseResponse(original, updatedExpense)
        }
        return `Não encontrei nenhum gasto com o ID "${editData.expenseId}". Por favor, verifique o ID e tente novamente.`
      }
      return 'Não consegui entender os detalhes da edição. Por favor, especifique qual gasto deseja editar e quais informações deseja alterar.'
    }

    if (intent === 'QUERY_EXPENSES') {
      const filters = await this.expenseQueryExtractor.extractQueryFilters(message)
      const today = new Date()

      // Ajustar para o final do dia atual
      const endOfDay = new Date(today)
      endOfDay.setHours(23, 59, 59, 999)

      // Ajustar para o início da semana (mantendo domingo como primeiro dia)
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - today.getDay())
      startOfWeek.setHours(0, 0, 0, 0)

      // Ajustar para o início do mês
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      startOfMonth.setHours(0, 0, 0, 0)

      const weeklyExpenses = await this.expenseManager.getExpenses(
        {
          ...filters,
          startDate: startOfWeek.toISOString().split('T')[0],
          endDate: endOfDay.toISOString().split('T')[0]
        },
        userId
      )

      const monthlyExpenses = await this.expenseManager.getExpenses(
        {
          ...filters,
          startDate: startOfMonth.toISOString().split('T')[0],
          endDate: endOfDay.toISOString().split('T')[0]
        },
        userId
      )

      return this.responseFormatter.formatQueryExpensesResponse(weeklyExpenses, monthlyExpenses, filters)
    }

    return 'Como posso ajudar com suas finanças? Você pode me pedir para registrar gastos ou consultar seus gastos existentes.'
  }

  private buildRecentExpensesContext (expenses: Expense[]): string {
    let context = 'Lista de gastos recentes, para consultar os ids:\n'
    expenses.forEach(expense => {
      context += `ID: ${expense.id} | ${expense.description} - R$ ${expense.amount} (${expense.category}) - ${expense.date.toLocaleDateString('pt-BR')}\n`
    })
    return context
  }
}
