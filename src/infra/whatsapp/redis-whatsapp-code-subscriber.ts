import Redis from 'ioredis'
import { IWhatsAppCodeSubscriber } from '../../domain/services/whatsapp-code-subscriber'
import { IClient } from '../../main/protocols/IClient'

export class RedisWhatsappCodeSubscriber implements IWhatsAppCodeSubscriber {
  private readonly subscriber: Redis
  private readonly publisher: Redis
  private readonly client: IClient

  constructor (client: IClient) {
    const redisUrl = process.env.REDIS_URL
    if (redisUrl === undefined || redisUrl === '') {
      throw new Error('REDIS_URL não definida')
    }

    this.client = client
    this.subscriber = new Redis(redisUrl)
    this.publisher = new Redis(redisUrl)
  }

  start (): void {
    void this.subscriber.subscribe('whatsapp.send_code', (err) => {
      if (err != null) {
        console.error('Redis subscribe error:', err)
      }
    })

    this.subscriber.on('message', (channel, message) => {
      if (channel !== 'whatsapp.send_code') {
        return
      }

      try {
        const payload = JSON.parse(message) as { id?: string, phone?: string, code?: string }
        const requestId = payload.id ?? ''
        const phone = payload.phone ?? ''
        const code = payload.code ?? ''

        if (phone === '' || code === '') {
          console.error('Invalid message payload for WhatsApp code')
          return
        }

        void this.sendWhatsAppCode(phone, code, requestId).catch((err) => {
          console.error('Failed to send WhatsApp code:', err)
        })
      } catch (err) {
        console.error('Invalid JSON message in Redis:', err)
      }
    })
  }

  private normalizePhone (phone: string): string {
    return phone.replace(/\D/g, '')
  }

  private async sendWhatsAppCode (phone: string, code: string, requestId: string): Promise<void> {
    const digits = this.normalizePhone(phone)
    if (digits.length < 10 || digits.length > 15) {
      throw new Error('Invalid phone number')
    }

    const mapping = await this.client.getPnLidEntry(`${digits}@c.us`)
    const lid = mapping?.lid?._serialized
    const chatId = await this.client.getNumberId(digits)
    if (chatId == null || chatId === '') {
      throw new Error('Número de WhatsApp não encontrado ou não registrado')
    }

    await this.client.sendText(chatId, `Seu código de confirmação é: ${code}`)
    if (requestId !== '') {
      await this.publisher.publish('whatsapp.code_sent', JSON.stringify({
        id: requestId,
        phone,
        lid: lid ?? chatId
      }))
    }
  }
}
