export interface SubscriptionsRepository {
  // Retorna o status da assinatura do usuário
  getSubscriptionStatus: (userId: string) => Promise<boolean>

  // Retorna o link para se assinar o bot
  createSubscriptionLink: (userId: string) => Promise<string>
}
