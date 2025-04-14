import { Expense } from '../../domain/models/expense'
import { ExpenseFilters } from '../datasources/expenses-datasource'

export class ResponseFormatter {
  formatAddExpenseResponse (expense: Expense): string {
    const formattedDescription = this.capitalizeWords(expense.description)
    const formattedCategory = typeof expense.category === 'string' && expense.category.trim() !== ''
      ? this.capitalizeWords(expense.category)
      : 'Sem categoria'
    return `✅ Gasto salvo: ${formattedDescription} - R$ ${expense.amount} (${formattedCategory})`
  }

  formatDeleteExpenseResponse (description: string, category?: string | null): string {
    const formattedDescription = this.capitalizeWords(description)
    const formattedCategory = typeof category === 'string' && category.trim() !== ''
      ? this.capitalizeWords(category)
      : 'Sem categoria'

    const message = (formattedCategory !== 'Sem categoria') ? `${formattedDescription} (${formattedCategory})` : formattedDescription
    return `✅ "${message}" deletado com sucesso!`
  }

  formatEditExpenseResponse (
    original: Expense,
    updated: Expense
  ): string {
    const changes: string[] = []
    if (updated.description !== original.description) {
      changes.push(`descrição de "${original.description}" para "${updated.description}"`)
    }
    if (updated.amount !== original.amount) {
      changes.push(`valor de R$${original.amount} para R$${updated.amount}`)
    }
    if (updated.category !== original.category) {
      changes.push(`categoria de "${original.category}" para "${updated.category}"`)
    }
    if (updated.date.getTime() !== original.date.getTime()) {
      changes.push(`data para ${updated.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`)
    }
    return `✅ Gasto editado com sucesso! Alterações: ${changes.join(', ')}.`
  }

  formatQueryExpensesResponse (
    weeklyExpenses: Expense[],
    monthlyExpenses: Expense[],
    filters: Partial<ExpenseFilters>
  ): string {
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    startOfMonth.setHours(0, 0, 0, 0)

    let weeklyReport = `📊 **RELATÓRIO SEMANAL** (${startOfWeek.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })} até ${today.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}):\n\n`

    if (weeklyExpenses.length === 0) {
      weeklyReport += 'Nenhum gasto registrado nesta semana.\n\n'
    } else {
      let weeklyTotal = 0
      weeklyExpenses.forEach(expense => {
        const formattedDescription = this.capitalizeWords(expense.description)
        const formattedCategory = typeof expense.category === 'string' && expense.category.trim() !== ''
          ? this.capitalizeWords(expense.category)
          : 'Sem categoria'
        weeklyReport += `- ${formattedDescription}: R$ ${expense.amount.toFixed(2)} (${formattedCategory}) em ${expense.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}\n`
        weeklyTotal += expense.amount
      })

      const days = Math.max(1, Math.round((today.getTime() - startOfWeek.getTime()) / (1000 * 60 * 60 * 24)))
      const weeklyAverage = weeklyTotal / days
      weeklyReport += `\n💰 **Total semanal: R$ ${weeklyTotal.toFixed(2)}**`
      weeklyReport += `\n📅 **Média diária: R$ ${weeklyAverage.toFixed(2)}**\n\n`
    }

    let monthlyReport = `📊 **RELATÓRIO MENSAL** (${startOfMonth.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })} até ${today.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}):\n\n`

    if (monthlyExpenses.length === 0) {
      monthlyReport += 'Nenhum gasto registrado neste mês.\n'
    } else {
      let monthlyTotal = 0
      const categorySums: { [key: string]: number } = {}
      monthlyExpenses.forEach(expense => {
        const category = typeof expense.category === 'string' && expense.category.trim() !== ''
          ? expense.category
          : 'sem categoria'
        categorySums[category] = (isNaN(categorySums[category]) ? 0 : categorySums[category]) + expense.amount
        monthlyTotal += expense.amount
      })

      Object.entries(categorySums).forEach(([category, sum]) => {
        const formattedCategory = this.capitalizeWords(category)
        monthlyReport += `- ${formattedCategory}: R$ ${sum.toFixed(2)}\n`
      })

      const days = Math.max(1, Math.round((today.getTime() - startOfMonth.getTime()) / (1000 * 60 * 60 * 24)))
      const monthlyAverage = monthlyTotal / days
      monthlyReport += `\n💰 **Total mensal: R$ ${monthlyTotal.toFixed(2)}**`
      monthlyReport += `\n📅 **Média diária: R$ ${monthlyAverage.toFixed(2)}**`
    }

    let filterMessage = ''
    if (filters.category != null) {
      const formattedCategory = this.capitalizeWords(filters.category)
      filterMessage += `\n\n⚠️ Filtro aplicado: Categoria "${formattedCategory}"`
    }
    if (filters.description != null) {
      const formattedDescription = this.capitalizeWords(filters.description)
      filterMessage += `\n\n⚠️ Filtro aplicado: Descrição contendo "${formattedDescription}"`
    }

    return weeklyReport + monthlyReport + filterMessage
  }

  private capitalizeWords (text: string): string {
    if (text.length === 0) return ''
    return text
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }
}
