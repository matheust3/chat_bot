import Groq from 'groq-sdk'
import { JsonExtractor } from '../../main/helpers/json-extractor'

export type Intent = 'ADD_EXPENSE' | 'EDIT_EXPENSE' | 'QUERY_EXPENSES' | 'OTHER'

export class IntentClassifier {
  private readonly client: Groq

  constructor (client: Groq) {
    this.client = client
  }

  async classifyIntent (message: string): Promise<Intent> {
    const response = await this.client.chat.completions.create({
      model: process.env.BASIC_MODEL ?? 'llama3-8b-8192',
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente financeiro. Sua tarefa é ajudar o usuário a registrar e consultar gastos.'
        },
        {
          role: 'system',
          content:
            'Classifique a intenção do usuário em uma das seguintes categorias: ADD_EXPENSE, EDIT_EXPENSE, QUERY_EXPENSES, ou OTHER. Responda apenas retornando um objeto JSON com a intenção, sem explicações adicionais. Exemplo: {"intent": "ADD_EXPENSE"}'
        },
        {
          role: 'user',
          content: message
        }
      ]
    })

    const intentData = this.extractJsonFromText<{ intent: string }>(
      response.choices[0].message.content?.trim() ?? '{"intent":"OTHER"}'
    )
    return intentData?.intent as Intent
  }

  private extractJsonFromText<T>(text: string): T | null {
    return JsonExtractor.extract<T>(text)
  }
}
