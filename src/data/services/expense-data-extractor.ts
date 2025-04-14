import Groq from 'groq-sdk'
import { Expense } from '../../domain/models/expense'
import { JsonExtractor } from '../../main/helpers/json-extractor'

export class ExpenseDataExtractor {
  private readonly client: Groq

  constructor (client: Groq) {
    this.client = client
  }

  async extractAddExpenseData (message: string): Promise<Partial<Expense>> {
    const response = await this.client.chat.completions.create({
      model: process.env.BASIC_MODEL ?? 'llama3-8b-8192',
      messages: [
        {
          role: 'system',
          content: 'A data de hoje é ' + new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        },
        {
          role: 'system',
          content: 'Você é um assistente financeiro. Sua tarefa é ajudar o usuário a registrar e consultar gastos do usuário.'
        },
        {
          role: 'system',
          content:
            'Extraia as informações de gasto da mensagem do usuário e retorne apenas um objeto JSON com os campos: description (string), amount (number), category (string), date (opcional, formato YYYY-MM-DD). É de extrema importância que as informações estejam no padrão pt-BR.'
        },
        {
          role: 'user',
          content: message
        }
      ]
    })

    const extractedData = this.extractJsonFromText<{
      description?: string | null
      amount?: number | null
      category?: string | null
      date?: string | null
    }>(response.choices[0].message.content ?? '') ?? {}

    // Converter `null` para `undefined` para compatibilidade com `Partial<Expense>`
    return {
      description: extractedData.description ?? undefined,
      amount: extractedData.amount ?? undefined,
      category: extractedData.category ?? undefined,
      date: (extractedData.date != null) ? new Date(extractedData.date) : undefined
    }
  }

  async extractEditExpenseData (
    message: string,
    recentExpensesContext: string
  ): Promise<{ expenseId?: string, updates?: Partial<Expense> }> {
    const response = await this.client.chat.completions.create({
      model: process.env.BASIC_MODEL ?? 'llama3-8b-8192',
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente financeiro. Sua tarefa é ajudar o usuário a editar gastos existentes.'
        },
        {
          role: 'system',
          content: recentExpensesContext
        },
        {
          role: 'system',
          content:
            'Com base na lista de gastos recentes acima, extraia as informações de edição da mensagem do usuário e retorne apenas um objeto JSON com os campos: expenseId (string - o ID exato do gasto a ser editado - DEVE SER UM ID DA LISTA DE GASTOS RECENTES, NUNCA INVENTE UM ID), updates (objeto com os campos a serem atualizados, que podem ser: description, amount, category, date no formato YYYY-MM-DD).'
        },
        {
          role: 'user',
          content: message
        }
      ]
    })

    const extractedData = this.extractJsonFromText<{
      expenseId?: string | null
      updates?: {
        description?: string | null
        amount?: number | null
        category?: string | null
        date?: string | null
      }
    }>(response.choices[0].message.content ?? '') ?? {}

    // Converter `null` para `undefined` para compatibilidade com o tipo esperado
    return {
      expenseId: extractedData.expenseId ?? undefined,
      updates: (extractedData.updates != null)
        ? {
            description: extractedData.updates.description ?? undefined,
            amount: extractedData.updates.amount ?? undefined,
            category: extractedData.updates.category ?? undefined,
            date: extractedData.updates.date != null ? new Date(extractedData.updates.date) : undefined
          }
        : undefined
    }
  }

  async extractDeleteExpenseData (message: string, recentExpensesContext: string): Promise<{ expenseId?: string }> {
    const response = await this.client.chat.completions.create({
      model: process.env.BASIC_MODEL ?? 'llama3-8b-8192',
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente financeiro. Sua tarefa é ajudar o usuário a deletar gastos existentes.'
        },
        {
          role: 'system',
          content: recentExpensesContext
        },
        {
          role: 'system',
          content:
            'Com base na lista de gastos recentes acima, extraia o ID do gasto que o usuário deseja deletar e retorne apenas um objeto JSON com o campo: expenseId (string - o ID exato do gasto a ser deletado - DEVE SER UM ID DA LISTA DE GASTOS RECENTES, NUNCA INVENTE UM ID). Exemplo: {"expenseId": "abc123"}'
        },
        {
          role: 'user',
          content: message
        }
      ]
    })

    return JsonExtractor.extract<{ expenseId?: string }>(response.choices[0].message.content ?? '') ?? {}
  }

  private extractJsonFromText<T>(text: string): T | null {
    return JsonExtractor.extract<T>(text)
  }
}
