export interface PaymentIntent {
  link: string
  userId: string
  code: string // Code é o identificador do pagamento usado para buscar o pagamento no gateway
  id: string // ID do pagamento no gateway
  createdAt: Date
}

export interface Subscription {
  id: string
  userId: string
  status: string
  code: string // Código do pagamento
  nextPaymentDate: Date
}

export interface PaymentService {
  createPaymentIntent: (userId: string) => Promise<PaymentIntent>

  getSubscriptionByPaymentCode: (userId: string, code: string) => Promise<Subscription | null>

  getPaymentIntentByUserId: (userId: string) => Promise<PaymentIntent []>

  deletePaymentIntent: (id: string) => Promise<boolean>
}
