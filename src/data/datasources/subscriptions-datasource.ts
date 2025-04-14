import { PaymentIntent, Subscription } from '../../domain/services/payment-service'

export interface SubscriptionDatasource {
  // PaymentIntent CRUD
  createPaymentIntent: (paymentIntent: PaymentIntent) => Promise<PaymentIntent>
  getPaymentIntent: (id: string) => Promise<PaymentIntent | null>
  getPaymentIntentByCode: (code: string) => Promise<PaymentIntent | null>
  getPaymentIntentsByUserId: (userId: string) => Promise<PaymentIntent[]>
  updatePaymentIntent: (id: string, updates: Partial<PaymentIntent>) => Promise<PaymentIntent | null>
  deletePaymentIntent: (id: string) => Promise<boolean>

  // Subscription CRUD
  createSubscription: (subscription: Subscription) => Promise<Subscription>
  getSubscription: (id: string) => Promise<Subscription | null>
  getSubscriptionByCode: (code: string) => Promise<Subscription | null>
  getActiveSubscriptionByUserId: (userId: string) => Promise<Subscription | null>
  getAllSubscriptionsByUserId: (userId: string) => Promise<Subscription[]>
  updateSubscription: (id: string, updates: Partial<Subscription>) => Promise<Subscription | null>
  deleteSubscription: (id: string) => Promise<boolean>
}
