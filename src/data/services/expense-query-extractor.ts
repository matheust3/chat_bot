import Groq from 'groq-sdk'
import { ExpenseFilters } from '../datasources/expenses-datasource'
import { JsonExtractor } from '../../main/helpers/json-extractor'

export class ExpenseQueryExtractor {
  private readonly client: Groq

  constructor (client: Groq) {
    this.client = client
  }

  async extractQueryFilters (message: string): Promise<Partial<ExpenseFilters>> {
    const response = await this.client.chat.completions.create({
      model: process.env.BASIC_MODEL ?? 'llama3-8b-8192',
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente financeiro. Sua tarefa é ajudar o usuário a consultar gastos.'
        },
        {
          role: 'system',
          content:
            'Extraia APENAS os parâmetros de filtro da mensagem do usuário e retorne um objeto JSON com os campos: category (string, opcional), description (string, opcional), minAmount (number, opcional), maxAmount (number, opcional). Não extraia datas ou períodos.'
        },
        {
          role: 'user',
          content: message
        }
      ]
    })

    return this.extractJsonFromText<Partial<ExpenseFilters>>(response.choices[0].message.content ?? '{}') ?? {}
  }

  private extractJsonFromText<T>(text: string): T | null {
    return JsonExtractor.extract<T>(text)
  }
}
