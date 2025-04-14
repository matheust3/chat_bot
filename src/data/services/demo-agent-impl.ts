import { SubscriptionsRepository } from '../../domain/repositories/subscriptions-repository'
import { IAAgent } from '../../domain/services/ai-agent'

export class DemoAgentImpl implements IAAgent {
  private readonly aiAgent: IAAgent
  private readonly subscriptionRepository: SubscriptionsRepository
  private readonly userStates: Map<string, {
    step: 'welcome' | 'waiting_for_expense' | 'waiting_for_report' | 'completed'
    lastResponse: string
  }> = new Map()

  constructor (aiAgent: IAAgent, subscriptionRepository: SubscriptionsRepository) {
    this.aiAgent = aiAgent
    this.subscriptionRepository = subscriptionRepository
  }

  async handleMessage (message: string, userId: string): Promise<string> {
    // Verificar se o usuário já tem assinatura
    const hasSubscription = await this.subscriptionRepository.getSubscriptionStatus(userId)

    // Se o usuário já tem assinatura, passar direto para o agente real
    if (hasSubscription) {
      return await this.aiAgent.handleMessage(message, userId)
    }

    // Verificar se o usuário já completou o tutorial
    if (this.userStates.get(userId)?.step === 'completed') {
      // Se completou mas não assinou, sempre retornar mensagem de assinatura
      return await this.getSubscriptionMessage(userId)
    }

    // Obter ou inicializar o estado do usuário
    let userState = this.userStates.get(userId)
    if (userState == null) {
      userState = { step: 'welcome', lastResponse: '' }
      this.userStates.set(userId, userState)

      // Se é a primeira interação, retornar mensagem de boas-vindas
      return this.getWelcomeMessage()
    }

    // Processar a mensagem com base no estado atual do usuário
    switch (userState.step) {
      case 'welcome': {
        // Usuário acabou de receber a mensagem de boas-vindas
        // Encaminhar mensagem para o agente real e atualizar estado
        const expenseResponse = await this.aiAgent.handleMessage(message, userId)

        // Verificar se o agente real salvou um gasto
        if (expenseResponse.includes('salvo')) {
          this.userStates.set(userId, { step: 'waiting_for_expense', lastResponse: expenseResponse })
          // Sugerir consultar os gastos
          return `${expenseResponse}\n\n✨ Ótimo! Você registrou seu primeiro gasto!\n\nAgora experimente consultar seus gastos. Você pode digitar algo como:\n• "Mostre meus gastos da semana"\n• "Quanto gastei este mês?"`
        } else {
          // Se a resposta não contiver "salvo", manter o mesmo estado
          return `${expenseResponse}\n\nTente adicionar um gasto dizendo algo como:\n• "Gastei R$30 com almoço hoje"\n• "Paguei R$15 no transporte"`
        }
      }

      case 'waiting_for_expense': {
        // Usuário já adicionou um gasto e estamos aguardando o pedido de relatório
        const reportResponse = await this.aiAgent.handleMessage(message, userId)

        // Verificar se o agente real retornou um relatório
        if (reportResponse.includes('RELATÓRIO')) {
          this.userStates.set(userId, { step: 'completed', lastResponse: reportResponse })

          // Mostrar o relatório e informar que precisa assinar para continuar
          return `${reportResponse}\n\n🔒 **Demonstração concluída!**\n\nVocê viu como é fácil controlar suas finanças com nosso assistente!\n\nPara continuar usando, é necessário assinar nosso plano:\n${await this.getSubscriptionLink(userId)}\n\nCom a assinatura, você terá acesso a:\n✅ Registro ilimitado de gastos\n✅ Relatórios detalhados\n✅ Categorização automática\n✅ Suporte prioritário`
        } else {
          // Se a resposta não contiver "RELATÓRIO", manter o mesmo estado
          return `${reportResponse}\n\nPara ver um resumo dos seus gastos, tente perguntar:\n• "Mostre meus gastos da semana"\n• "Relatório de despesas"`
        }
      }

      default:
        // Caso de fallback - não deveria chegar aqui, mas por segurança
        return await this.getSubscriptionMessage(userId)
    }
  }

  private getWelcomeMessage (): string {
    return `👋 **Bem-vindo ao seu assistente financeiro pessoal!**

Estou aqui para ajudar você a controlar seus gastos de forma simples e prática.

Para começar, que tal registrar seu primeiro gasto? É fácil! Apenas me conte o que você gastou, como por exemplo:

• "Gastei R$25 com almoço hoje"
• "Comprei um livro por R$45"
• "Paguei R$120 na conta de luz ontem"

Vamos lá, tente adicionar seu primeiro gasto agora!`
  }

  private async getSubscriptionMessage (userId: string): Promise<string> {
    const subscriptionLink = await this.getSubscriptionLink(userId)
    return `🔒 **Acesso Limitado**

Você já experimentou as funcionalidades básicas do nosso assistente financeiro. Para continuar utilizando e ter acesso a todos os recursos, é necessário assinar o plano premium.

${subscriptionLink}

Com a assinatura, você terá:
✅ Registro ilimitado de gastos
✅ Relatórios detalhados por categoria
✅ Previsões de gastos mensais

Assine agora e transforme sua gestão financeira!`
  }

  private async getSubscriptionLink (userId: string): Promise<string> {
    try {
      const paymentIntent = await this.subscriptionRepository.createSubscriptionLink(userId)
      return `[👉 Clique aqui para assinar](${paymentIntent})`
    } catch (error) {
      console.error('Erro ao gerar link de pagamento:', error)
      return 'Entre em contato com o suporte para assinar o plano premium.'
    }
  }
}
