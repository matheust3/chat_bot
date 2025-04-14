import { IAAgent } from '../../domain/services/ai-agent'
import Groq from 'groq-sdk'
import { ExpenseFilters, ExpensesDatasource } from '../datasources/expenses-datasource'
import { Expense } from '../../domain/models/expense'

export class GroqAiAgent implements IAAgent {
  private readonly client: Groq
  private readonly expenseDb: ExpensesDatasource

  constructor (db: ExpensesDatasource) {
    this.client = new Groq({ apiKey: process.env.GROQ_API_KEY })
    this.expenseDb = db
  }

  async handleMessage (message: string, userId: string): Promise<string> {
    // Primeiro, determine a intenção usando um modelo LLM
    const intentResponse = await this.client.chat.completions.create({
      model: process.env.BASIC_MODEL ?? 'llama3-8b-8192',
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente financeiro. Sua tarefa é ajudar o usuário a registrar e consultar gastos'
        },
        {
          role: 'system',
          content: 'Classifique a intenção do usuário em uma das seguintes categorias: ADD_EXPENSE, EDIT_EXPENSE, DELETE_EXPENSE, QUERY_EXPENSES, ou OTHER. Responda apenas retornando um objeto JSON com a intenção, sem explicações adicionais. Exemplo: {"intent": "ADD_EXPENSE"}'
        },
        {
          role: 'user',
          content: message
        }
      ]
    })

    const intent = this.extractJsonFromText<{ intent: string }>(intentResponse.choices[0].message.content?.trim() ?? '{"intent":"OTHER"}')

    console.log('Intenção detectada:', intent?.intent)

    // Com base na intenção, execute a lógica apropriada
    if (intent?.intent.includes('ADD_EXPENSE') === true) {
      // Use o LLM para extrair os parâmetros estruturados
      const extractionResponse = await this.client.chat.completions.create({
        model: process.env.BASIC_MODEL ?? 'llama3-8b-8192',
        messages: [
          {
            role: 'system',
            content: 'A data de hoje é ' + new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
          },
          {
            role: 'system',
            content: 'Você é um assistente financeiro. Sua tarefa é ajudar o usuário a registrar e consultar gastos do usuário'
          },
          {
            role: 'system',
            content: 'Extraia as informações de gasto da mensagem do usuário e retorne apenas um objeto JSON com os campos: description (string), amount (number), category (string), date (opcional, formato YYYY-MM-DD). É de extrema importância que as informações estejam no padrão pt-BR'
          },
          {
            role: 'user',
            content: message
          }
        ]
      })

      try {
        const extractedJson = this.extractJsonFromText<{
          description?: string | null
          amount?: number | null
          category?: string | null
          date?: string | null
        }>(extractionResponse.choices[0].message.content ?? '') ?? {}
        console.log('Dados do gasto extraídos (processados):', extractedJson)

        if (extractedJson.description !== null && extractedJson.description !== undefined && extractedJson.amount !== null && extractedJson.amount !== undefined) {
          const expenseToSave: Expense = {
            amount: Number(extractedJson.amount),
            description: extractedJson.description.toLowerCase(), // Salvar em minúsculas
            date: extractedJson.date !== null && extractedJson.date !== undefined ? new Date(extractedJson.date) : new Date(),
            category: (extractedJson.category !== undefined && extractedJson.category !== null)
              ? extractedJson.category.toLowerCase()
              : 'outros', // Categoria em minúsculas
            id: new Date().toISOString() + Math.random().toString(36).substring(2, 15) // Gerar um ID único,
          }

          const expense = await this.expenseDb.saveExpense(expenseToSave, userId)

          // Capitalizar primeira letra de cada palavra para exibição
          const formattedDescription = this.capitalizeWords(expense.description)
          const formattedCategory = (expense.category.length > 0) ? this.capitalizeWords(expense.category) : 'Sem categoria'

          return `✅ Gasto salvo: ${formattedDescription} - R$ ${expense.amount} (${formattedCategory})`
        }
      } catch (e) {
        // Falha ao parsear JSON
      }

      return 'Não consegui entender os detalhes do gasto. Tente ser mais específico.'
    } else if (intent?.intent.includes('EDIT_EXPENSE') === true) {
      // Primeiro, busque os gastos dos últimos 30 dias para fornecer como contexto
      const today = new Date()
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(today.getDate() - 30)

      const recentExpenses = await this.expenseDb.getExpenses({
        startDate: thirtyDaysAgo,
        endDate: today
      }, userId)

      // Formatar a lista de gastos recentes como contexto
      let recentExpensesContext = 'Lista de gastos recentes, para consultar os ids:\n'
      recentExpenses.forEach((expense, index) => {
        recentExpensesContext += `ID: ${expense.id} | ${expense.description} - R$ ${expense.amount} (${expense.category}) - ${expense.date.toLocaleDateString('pt-BR')}\n`
      })

      console.log(recentExpensesContext)
      // Extrair identificador e campos a serem atualizados
      const editExtractionResponse = await this.client.chat.completions.create({
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
            content: 'Com base na lista de gastos recentes acima, extraia as informações de edição da mensagem do usuário e retorne apenas um objeto JSON com os campos: expenseId (string - o ID exato do gasto a ser editado - DEVE SER UM ID DA LISTA DE GASTOS RECENTES, NUNCA INVENTE UM ID), updates (objeto com os campos a serem atualizados, que podem ser: description, amount, category, date no formato YYYY-MM-DD)'
          },
          {
            role: 'user',
            content: message
          }
        ]
      })

      try {
        const editData = this.extractJsonFromText<{
          expenseId?: string | null
          updates?: {
            description?: string | null
            amount?: number | null
            category?: string | null
            date?: string | null
          }
        }>(editExtractionResponse.choices[0].message.content ?? '')
        console.log('Dados de edição extraídos:', editData)

        if (editData?.expenseId !== undefined && editData?.updates !== undefined && Object.keys(editData.updates).length > 0) {
          // Procurar o gasto pelo ID em vez de pela descrição
          const expenseToEdit = recentExpenses.find(expense => expense.id === editData.expenseId)

          if (expenseToEdit == null) {
            return `Não encontrei nenhum gasto com o ID "${editData.expenseId as string}". Por favor, verifique o ID e tente novamente.`
          }

          // Criar objeto com os dados atualizados
          const updatedExpense: Expense = {
            ...expenseToEdit,
            description: editData.updates.description ?? expenseToEdit.description,
            amount: editData.updates.amount !== undefined ? Number(editData.updates.amount) : expenseToEdit.amount,
            category: editData.updates.category ?? expenseToEdit.category,
            date: editData.updates.date !== null && editData.updates.date !== undefined ? new Date(editData.updates.date) : expenseToEdit.date
          }

          // Atualizar o gasto
          await this.expenseDb.updateExpense(updatedExpense, userId)

          // Formatar resposta com as alterações realizadas
          const changes: string[] = []
          if (editData.updates.description !== undefined && editData.updates.description !== null) changes.push(`descrição de "${expenseToEdit.description}" para "${updatedExpense.description}"`)
          if (editData.updates.amount !== undefined && editData.updates.amount !== null) changes.push(`valor de R$${expenseToEdit.amount} para R$${updatedExpense.amount}`)
          if (editData.updates.category !== undefined && editData.updates.category !== null) changes.push(`categoria de "${expenseToEdit.category}" para "${updatedExpense.category}"`)
          if (editData.updates.date !== undefined && editData.updates.date !== null) changes.push(`data para ${updatedExpense.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`)

          return `✅ Gasto editado com sucesso! Alterações: ${changes.join(', ')}.`
        }
      } catch (e) {
        console.error('Erro ao processar edição:', e)
      }

      return 'Não consegui entender os detalhes da edição. Por favor, especifique qual gasto deseja editar e quais informações deseja alterar.'
    } else if (intent?.intent?.includes('QUERY_EXPENSES') === true) {
      // Calcular períodos para relatórios semanal e mensal
      const today = new Date()

      // Período semanal (domingo até hoje ou início da semana até hoje)
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - today.getDay()) // Domingo da semana atual
      startOfWeek.setHours(0, 0, 0, 0)

      // Período mensal (primeiro dia do mês até hoje)
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      startOfMonth.setHours(0, 0, 0, 0)

      // Extrair apenas parâmetros de categoria ou descrição, não de período
      const queryExtractionResponse = await this.client.chat.completions.create({
        model: process.env.BASIC_MODEL ?? 'llama3-8b-8192',
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente financeiro. Sua tarefa é ajudar o usuário a consultar gastos.'
          },
          {
            role: 'system',
            content: 'Extraia APENAS os parâmetros de filtro da mensagem do usuário e retorne um objeto JSON com os campos: category (string, opcional), description (string, opcional), minAmount (number, opcional), maxAmount (number, opcional). Não extraia datas ou períodos.'
          },
          {
            role: 'user',
            content: message
          }
        ]
      })

      try {
        // Extrair os parâmetros de filtro (sem datas)
        const filterParams = this.extractJsonFromText<Partial<ExpenseFilters>>(
          queryExtractionResponse.choices[0].message.content ?? '{}'
        ) ?? {}
        console.log('Parâmetros de filtro extraídos:', filterParams)

        // Converter parâmetros de filtro para minúsculas para busca
        if (filterParams.category != null) filterParams.category = filterParams.category.toLowerCase()
        if (filterParams.description != null) filterParams.description = filterParams.description.toLowerCase()

        // Buscar despesas da semana
        const weeklyExpenses = await this.expenseDb.getExpenses({
          ...filterParams,
          startDate: startOfWeek.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        }, userId)

        // Buscar despesas do mês
        const monthlyExpenses = await this.expenseDb.getExpenses({
          ...filterParams,
          startDate: startOfMonth.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        }, userId)

        // Formatar relatório semanal
        const startWeekFormatted = startOfWeek.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        const endWeekFormatted = today.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

        let weeklyReport = `📊 **RELATÓRIO SEMANAL** (${startWeekFormatted} até ${endWeekFormatted}):\n\n`

        if (weeklyExpenses.length === 0) {
          weeklyReport += 'Nenhum gasto registrado nesta semana.\n\n'
        } else {
          let weeklyTotal = 0
          weeklyExpenses.forEach(expense => {
            // Aplicar capitalização à descrição e categoria
            const formattedDescription = this.capitalizeWords(expense.description)
            const formattedCategory = (expense.category.length > 0) ? this.capitalizeWords(expense.category) : 'Sem categoria'

            weeklyReport += `- ${formattedDescription}: R$ ${expense.amount.toFixed(2)} (${formattedCategory}) em ${expense.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}\n`
            weeklyTotal += expense.amount
          })

          const days = Math.max(1, Math.round((today.getTime() - startOfWeek.getTime()) / (1000 * 60 * 60 * 24)))
          const weeklyAverage = weeklyTotal / days

          weeklyReport += `\n💰 **Total semanal: R$ ${weeklyTotal.toFixed(2)}**`
          weeklyReport += `\n📅 **Média diária: R$ ${weeklyAverage.toFixed(2)}**\n\n`
        }

        // Formatar relatório mensal
        const startMonthFormatted = startOfMonth.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        const endMonthFormatted = today.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

        let monthlyReport = `📊 **RELATÓRIO MENSAL** (${startMonthFormatted} até ${endMonthFormatted}):\n\n`

        if (monthlyExpenses.length === 0) {
          monthlyReport += 'Nenhum gasto registrado neste mês.\n'
        } else {
          let monthlyTotal = 0
          // Agregar gastos por categoria para o relatório mensal
          const categorySums: { [key: string]: number } = {}

          monthlyExpenses.forEach(expense => {
            const category = expense.category ?? 'sem categoria'
            if (categorySums[category] === undefined) {
              categorySums[category] = 0
            }
            categorySums[category] += expense.amount
            monthlyTotal += expense.amount
          })

          // Mostrar total por categoria
          Object.entries(categorySums).forEach(([category, sum]) => {
            // Capitalizar nomes das categorias
            const formattedCategory = this.capitalizeWords(category)
            monthlyReport += `- ${formattedCategory}: R$ ${(sum).toFixed(2)}\n`
          })

          const days = Math.max(1, Math.round((today.getTime() - startOfMonth.getTime()) / (1000 * 60 * 60 * 24)))
          const monthlyAverage = monthlyTotal / days

          monthlyReport += `\n💰 **Total mensal: R$ ${monthlyTotal.toFixed(2)}**`
          monthlyReport += `\n📅 **Média diária: R$ ${monthlyAverage.toFixed(2)}**`
        }

        // Filtro aplicado (se houver)
        let filterMessage = ''
        if (filterParams.category !== null && filterParams.category !== undefined && filterParams.category !== '') {
          // Usar valor original com capitalização para exibição
          const formattedCategory = this.capitalizeWords(filterParams.category)
          filterMessage += `\n\n⚠️ Filtro aplicado: Categoria "${formattedCategory}"`
        }
        if (filterParams.description !== null && filterParams.description !== undefined && filterParams.description !== '') {
          // Capitalizar descrição no filtro
          const formattedDescription = this.capitalizeWords(filterParams.description)
          filterMessage += `\n\n⚠️ Filtro aplicado: Descrição contendo "${formattedDescription}"`
        }

        return weeklyReport + monthlyReport + filterMessage
      } catch (e) {
        console.error('Erro ao processar consulta de despesas:', e)
      }

      return 'Não consegui gerar os relatórios de despesas. Por favor, tente novamente.'
    } else if (intent?.intent?.includes('DELETE_EXPENSE') === true) {
      // Primeiro, busque os gastos dos últimos 30 dias para fornecer como contexto
      const today = new Date()
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(today.getDate() - 30)

      const recentExpenses = await this.expenseDb.getExpenses({
        startDate: thirtyDaysAgo,
        endDate: today
      }, userId)

      // Formatar a lista de gastos recentes como contexto
      let recentExpensesContext = 'Lista de gastos recentes, para consultar os ids:\n'
      recentExpenses.forEach((expense, index) => {
        // Aplicar capitalização na exibição para o LLM
        const formattedDescription = this.capitalizeWords(expense.description)
        const formattedCategory = (expense.category.length > 0) ? this.capitalizeWords(expense.category) : 'Sem categoria'

        recentExpensesContext += `ID: ${expense.id} | ${formattedDescription} - R$ ${expense.amount} (${formattedCategory}) - ${expense.date.toLocaleDateString('pt-BR')}\n`
      })

      console.log(recentExpensesContext)

      // Extrair ID do gasto a ser excluído
      const deleteExtractionResponse = await this.client.chat.completions.create({
        model: process.env.BASIC_MODEL ?? 'llama3-8b-8192',
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente financeiro. Sua tarefa é ajudar o usuário a excluir gastos existentes.'
          },
          {
            role: 'system',
            content: recentExpensesContext
          },
          {
            role: 'system',
            content: 'Com base na lista de gastos recentes acima, extraia o ID exato do gasto que o usuário deseja excluir. Responda apenas com um objeto JSON contendo o campo expenseId. NUNCA invente um ID, deve ser exatamente igual a um ID da lista. Exemplo de resposta: {"expenseId": "id-do-gasto-aqui"}'
          },
          {
            role: 'user',
            content: message
          }
        ]
      })

      try {
        const deleteData = this.extractJsonFromText<{
          expenseId?: string | null
        }>(deleteExtractionResponse.choices[0].message.content ?? '')

        console.log('Dados de exclusão extraídos:', deleteData)

        if (deleteData?.expenseId !== undefined && deleteData?.expenseId !== null) {
          // Procurar o gasto pelo ID
          const expenseToDelete = recentExpenses.find(expense => expense.id === deleteData.expenseId)

          if (expenseToDelete == null) {
            return `Não encontrei nenhum gasto com o ID "${deleteData.expenseId}". Por favor, verifique o ID e tente novamente.`
          }

          // Formatar os dados para exibição na confirmação
          const formattedDescription = this.capitalizeWords(expenseToDelete.description)
          const formattedCategory = (expenseToDelete.category.length > 0) ? this.capitalizeWords(expenseToDelete.category) : 'Sem categoria'

          // Excluir o gasto
          await this.expenseDb.deleteExpense(deleteData.expenseId, userId)

          return `✅ Gasto excluído com sucesso: ${formattedDescription} - R$ ${expenseToDelete.amount} (${formattedCategory})`
        }
      } catch (e) {
        console.error('Erro ao processar exclusão:', e)
      }

      return 'Não consegui identificar qual gasto você deseja excluir. Por favor, especifique melhor ou forneça o ID do gasto.'
    }

    // Resposta genérica para outras intenções
    return 'Como posso ajudar com suas finanças? Você pode me pedir para registrar gastos ou consultar seus gastos existentes.'
  }

  private removeThinkTags (text: string): string {
    return text
      // Remover tags <think></think>
      .replace(/<think>([\s\S]*?)<\/think>/g, '$1')
      // Remover blocos de código markdown
      .replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, '$1')
      // Remover espaços extras no início e fim
      .trim()
  }

  /**
 * Extrai um objeto JSON válido de uma resposta, mesmo quando o JSON está
 * dentro de tags, formatação markdown, ou misturado com texto adicional.
 * @param text Texto que contém um objeto JSON
 * @returns O objeto JSON extraído ou null se nenhum JSON válido for encontrado
 */
  private extractJsonFromText<T> (text: string): T | null {
    if (text === null || text === undefined || text === '') return null

    try {
      // Primeiro tenta parsear diretamente, caso o texto seja um JSON válido
      try {
        return JSON.parse(text)
      } catch (e) {
        // Se falhar, continue com métodos alternativos
      }

      // Remover tags comuns que podem envolver o JSON
      const cleanedText = this.removeThinkTags(text)

      // Tenta parsear o texto limpo
      try {
        return JSON.parse(cleanedText)
      } catch (e) {
        // Continuar com outras abordagens se falhar
      }

      // Encontra qualquer estrutura JSON que comece com { e termine com }
      const jsonRegex = /{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*}/g
      const matches = text.match(jsonRegex)

      if ((matches != null) && matches.length > 0) {
        // Tente cada correspondência até encontrar uma válida
        for (const match of matches) {
          try {
            return JSON.parse(match)
          } catch (e) {
            continue
          }
        }
      }

      // Se todas as tentativas falharem, tente extrair campos individuais
      const possibleObject = {}
      let hasValidField = false

      // Tenta encontrar pares chave-valor no formato "chave": valor
      const keyValueRegex = /"([^"]+)"\s*:\s*(?:"([^"]*)"|(\d+(?:\.\d+)?)|(\w+))/g
      let keyValueMatch

      while ((keyValueMatch = keyValueRegex.exec(text)) !== null) {
        const key = keyValueMatch[1]
        // Captura o valor, que pode ser string, número ou booleano
        const value = keyValueMatch[2] !== undefined
          ? keyValueMatch[2] // string
          : keyValueMatch[3] !== undefined
            ? parseFloat(keyValueMatch[3]) // número
            : keyValueMatch[4] === 'true'
              ? true
              : keyValueMatch[4] === 'false'
                ? false
                : keyValueMatch[4] // outro valor

        possibleObject[key] = value
        hasValidField = true
      }

      if (hasValidField) {
        return possibleObject as T
      }

      // Se todas as tentativas falharem
      console.warn('Não foi possível extrair JSON válido de:', text)
      return null
    } catch (e) {
      console.error('Erro ao tentar extrair JSON:', e)
      return null
    }
  }

  /**
   * Capitaliza a primeira letra de cada palavra em uma string
   * @param text Texto a ser formatado
   * @returns Texto com a primeira letra de cada palavra em maiúsculo
   */
  private capitalizeWords (text: string): string {
    if (text.length === 0) return ''
    return text.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }
}
