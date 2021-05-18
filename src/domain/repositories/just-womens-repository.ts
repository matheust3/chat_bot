import { Contact, GroupChat, Message } from 'whatsapp-web.js'

export interface JustWomensRepository{
  onEnjoy: (contact: Contact, chatGroup: GroupChat) => Promise<void>
  onMessage: (message: Message, chatGroup: GroupChat) => Promise<void>
}
