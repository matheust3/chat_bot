import { IWhatsAppCodeSubscriber } from '../../domain/services/whatsapp-code-subscriber'
import { RedisWhatsappCodeSubscriber } from '../../infra/whatsapp/redis-whatsapp-code-subscriber'
import { IClient } from '../protocols/IClient'

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
class WhatsAppCodeSubscriberSingleton {
  private static instance: IWhatsAppCodeSubscriber

  static getInstance (client: IClient): IWhatsAppCodeSubscriber {
    if (WhatsAppCodeSubscriberSingleton.instance === undefined) {
      WhatsAppCodeSubscriberSingleton.instance = new RedisWhatsappCodeSubscriber(client)
    }
    return WhatsAppCodeSubscriberSingleton.instance
  }
}

export const createWhatsAppCodeSubscriber = (client: IClient): IWhatsAppCodeSubscriber => {
  return WhatsAppCodeSubscriberSingleton.getInstance(client)
}
