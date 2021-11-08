import { GroupChat, Message } from 'whatsapp-web.js'
import { BanRepository } from '../../domain/repositories/ban-repository'
import { BanLogsDatasource } from '../datasources/ban-logs-datasource'

export class BanRepositoryImpl implements BanRepository {
  constructor (private readonly _banLogsDatasource: BanLogsDatasource) {}
  async getLogs (message: Message): Promise<void> {
    const chat = await message.getChat()
    const contact = await chat.getContact()
    const logs = await this._banLogsDatasource.getBanLog(contact.id._serialized)

    let response = ''
    logs.forEach((value) => {
      response += `date: ${value.date ?? ''}\nlog: ${value.log}\n---\n`
    })

    await message.reply(response === '' ? 'Limpo! 👊' : response)
  }

  async ban (message: Message, log: string): Promise<void> {
    const chat = await message.getChat() as GroupChat
    if (chat.isGroup) {
      const contact = await message.getContact()
      if (!contact.isMe) {
        await chat.removeParticipants([contact.id._serialized])
        await this._banLogsDatasource.registryBan(contact.id._serialized, log)
      }
    }
  }

  async adminBan (message: Message): Promise<void> {
    const chat: GroupChat = await message.getChat() as GroupChat
    if (chat.isGroup && message.hasQuotedMsg) {
      const contact = await message.getContact()
      const participant = chat.participants.find((value) => value.id._serialized === contact.id._serialized)
      if (participant?.isAdmin === true) {
        const quotedMsg = await message.getQuotedMessage()
        const contactToRemove = await quotedMsg.getContact()
        if (!contactToRemove.isMe) {
          await chat.removeParticipants([contactToRemove.id._serialized])
          await this._banLogsDatasource.registryBan(contactToRemove.id._serialized, 'from admin')
        } else {
          await message.reply('🤨')
        }
      }
    }
  }
}
