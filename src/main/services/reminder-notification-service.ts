import Redis from 'ioredis'
import { IClient } from '../protocols/IClient'
import { PrismaClientInstance } from '../../infra/prisma-client'

const REMINDER_QUEUE = String(process.env.REMINDER_QUEUE ?? 'reminders.notifications')
const REMINDER_CHECK_INTERVAL = Number(process.env.REMINDER_CHECK_INTERVAL_MS ?? 5000)

interface ReminderNotification {
  type: 'reminder'
  userId: string
  message: string
  reminderId: string
}

export class ReminderNotificationService {
  private redis: Redis
  private client: IClient | null = null
  private running = false

  constructor () {
    const redisUrl = String(process.env.REDIS_URL ?? '').trim()
    if (redisUrl === '') {
      throw new Error('REDIS_URL não definida')
    }
    this.redis = new Redis(redisUrl)
  }

  setClient (client: IClient): void {
    this.client = client
  }

  async start (): Promise<void> {
    if (this.running) return
    this.running = true
    console.log('[ReminderNotificationService] Iniciado')
    void this.processQueue()
  }

  async stop (): Promise<void> {
    this.running = false
    await this.redis.quit()
  }

  private async processQueue (): Promise<void> {
    while (this.running) {
      try {
        const result = await this.redis.blpop(REMINDER_QUEUE, 5)
        if (result != null) {
          const [, rawNotification] = result
          await this.handleNotification(rawNotification)
        }
      } catch (err) {
        console.error('[ReminderNotificationService] Erro ao processar fila:', err)
        await new Promise(resolve => setTimeout(resolve, REMINDER_CHECK_INTERVAL))
      }
    }
  }

  private async handleNotification (rawNotification: string): Promise<void> {
    try {
      const notification = JSON.parse(rawNotification) as ReminderNotification
      
      if (notification.type !== 'reminder') {
        console.warn('[ReminderNotificationService] Tipo de notificação desconhecido:', notification.type)
        return
      }

      // Busca informações do usuário
      const user = await PrismaClientInstance.user.findUnique({
        where: { id: notification.userId },
        select: { whatsappNumber: true, whatsappLid: true }
      })

      if (user == null) {
        console.warn('[ReminderNotificationService] Usuário não encontrado:', notification.userId)
        return
      }

      const whatsappId = user.whatsappLid ?? user.whatsappNumber
      if (whatsappId == null || whatsappId.trim() === '') {
        console.warn('[ReminderNotificationService] WhatsApp não configurado para usuário:', notification.userId)
        return
      }

      // Envia mensagem via WhatsApp
      if (this.client != null) {
        await this.client.sendText(whatsappId, notification.message)
        console.log(`[ReminderNotificationService] Lembrete enviado para ${whatsappId}`)
      } else {
        console.warn('[ReminderNotificationService] Cliente WhatsApp não configurado')
      }
    } catch (err) {
      console.error('[ReminderNotificationService] Erro ao processar notificação:', err)
    }
  }
}
