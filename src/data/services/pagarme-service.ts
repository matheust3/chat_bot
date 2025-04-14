import axios from 'axios'
import { PaymentIntent, PaymentService, Subscription } from '../../domain/services/payment-service'
import { SubscriptionDatasource } from '../datasources/subscriptions-datasource'

export class PagarmeService implements PaymentService {
  private readonly apiKey: string = process.env.PAGARME_API_KEY
  private readonly planId: string = process.env.PLAN_ID
  private readonly baseUrl: string = 'https://api.pagar.me/core/v5'
  private readonly subscriptionDatasource: SubscriptionDatasource

  constructor (subscriptionDatasource: SubscriptionDatasource) {
    this.subscriptionDatasource = subscriptionDatasource
  }

  async createPaymentIntent (userId: string): Promise<PaymentIntent> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/payment_links`,
        {
          is_building: false,
          payment_settings: {
            credit_card_settings: {
              installments_setup: {
                interest_type: 'simple'
              },
              operation_type: 'auth_and_capture'
            },
            accepted_payment_methods: ['credit_card'],
            statement_descriptor: 'SuperBot'
          },
          cart_settings: {
            recurrences: [
              {
                plan_id: this.planId
              }
            ]
          },
          name: userId,
          type: 'subscription',
          expires_in: 1440, // 1 dia
          max_paid_sessions: 1,
          max_sessions: 1
        },
        {
          headers: {
            accept: 'application/json',
            authorization: `Basic ${Buffer.from(this.apiKey + ':').toString('base64')}`,
            'content-type': 'application/json'
          }
        }
      )

      const paymentLink = response.data.url
      if (paymentLink != null) {
        const paymentIntent = await this.subscriptionDatasource.createPaymentIntent({
          link: paymentLink,
          userId,
          code: response.data.code,
          id: response.data.id
        })
        return paymentIntent
      } else {
        throw new Error('Link de pagamento não gerado')
      }
    } catch (error) {
      console.error('Erro ao criar link de pagamento:', error.response?.data)
      throw new Error('Falha ao criar link de pagamento')
    }
  }

  async getSubscriptionByPaymentCode (userId: string, code: string): Promise<Subscription | null> {
    try {
      // Primeiro verifica se já existe essa assinatura no banco de dados
      const existingSubscription = await this.subscriptionDatasource.getSubscriptionByCode(code)

      // Se existir uma assinatura ativa no banco, retorna ela diretamente
      if ((existingSubscription != null) && existingSubscription.status === 'active') {
        const nextDay = new Date()
        nextDay.setDate(existingSubscription.nextPaymentDate.getDate() + 1)
        // Verifica se a data do próximo pagamento ainda é válida
        if (nextDay > new Date()) {
          return existingSubscription
        }
      }

      // Se não existir ou não estiver ativa, busca no gateway
      const response = await axios.get('https://api.pagar.me/core/v5/subscriptions', {
        params: {
          code,
          page: 1,
          size: 10
        },
        headers: {
          accept: 'application/json',
          authorization: `Basic ${Buffer.from(this.apiKey + ':').toString('base64')}`
        }
      })

      if (response.data?.data != null && response.data.data.length > 0) {
        // deve percorrer todas as assinaturas e retornar a primeira que stiver com status active
        const activeSubscription = response.data.data.find((sub: Subscription) => sub.status === 'active')
        if (activeSubscription != null) {
          const subscription: Subscription = {
            id: activeSubscription.id,
            userId,
            status: activeSubscription.status,
            code: activeSubscription.code,
            nextPaymentDate: new Date(activeSubscription.next_billing_at)
          }

          // Salva ou atualiza a assinatura no banco de dados
          if (existingSubscription != null) {
            await this.subscriptionDatasource.updateSubscription(existingSubscription.id, subscription)
          } else {
            await this.subscriptionDatasource.createSubscription(subscription)
          }

          return subscription
        } else {
          // Se não encontrou assinatura ativa no gateway mas existe no banco
          if (existingSubscription != null) {
            // Atualiza o status no banco para inativo se necessário
            if (existingSubscription.status === 'active') {
              await this.subscriptionDatasource.updateSubscription(existingSubscription.id, { status: 'inactive' })
            }
          }
          console.log('Nenhuma assinatura ativa encontrada para o código:', code)
          return null
        }
      } else {
        return null
      }
    } catch (error) {
      console.error('Erro ao buscar assinaturas:', error)
      return null
    }
  }

  async getPaymentIntentByUserId (userId: string): Promise<PaymentIntent[]> {
    try {
      const paymentIntent = await this.subscriptionDatasource.getPaymentIntentsByUserId(userId)
      if (paymentIntent != null) {
        return paymentIntent
      } else {
        console.log('Nenhum pagamento encontrado para o usuário:', userId)
        return []
      }
    } catch (error) {
      console.error('Erro ao buscar pagamento:', error)
      return []
    }
  }

  async deletePaymentIntent (id: string): Promise<boolean> {
    try {
      const deleted = await this.subscriptionDatasource.deletePaymentIntent(id)
      if (deleted) {
        return true
      } else {
        console.log('Nenhum pagamento encontrado para o ID:', id)
        return false
      }
    } catch (error) {
      console.error('Erro ao deletar pagamento:', error)
      return false
    }
  }
}
