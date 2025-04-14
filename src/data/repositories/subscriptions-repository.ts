import { SubscriptionsRepository } from '../../domain/repositories/subscriptions-repository'
import { PaymentService } from '../../domain/services/payment-service'

export class SubscriptionsRepositoryImpl implements SubscriptionsRepository {
  private readonly paymentService: PaymentService

  constructor (paymentService: PaymentService) {
    this.paymentService = paymentService
  }

  async getSubscriptionStatus (userId: string): Promise<boolean> {
    // Pega as intenções de pagamento do usuário
    const paymentIntents = await this.paymentService.getPaymentIntentByUserId(userId)
    // Para cada intenção de pagamento, verifica a subscription correspondente
    let validSubscription = false
    for (const paymentIntent of paymentIntents) {
      const subscription = await this.paymentService.getSubscriptionByPaymentCode(userId, paymentIntent.code)
      // Se a assinatura estiver ativa, retorna true
      if ((subscription != null) && subscription.status === 'active') {
        validSubscription = true
        continue
      }

      // Se a intenção de pagamento tem mais de 2 dias, remove do banco de dados
      const now = new Date()
      const diff = now.getTime() - paymentIntent.createdAt.getTime()
      const diffInDays = Math.floor(diff / (1000 * 60 * 60 * 24))
      if (diffInDays > 2) {
        await this.paymentService.deletePaymentIntent(paymentIntent.id)
      }
    }
    return validSubscription
  }

  async createSubscriptionLink (userId: string): Promise<string> {
    // Cria uma intenção de pagamento
    const paymentIntent = await this.paymentService.createPaymentIntent(userId)
    // Retorna o link de pagamento
    return paymentIntent.link
  }
}
