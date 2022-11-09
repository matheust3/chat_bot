import { Message } from 'whatsapp-web.js'
import { IMessage } from '../protocols/IMessage'

export const messageAdapter = (message: Message): IMessage => {
  return {
    body: message.body
  }
}
