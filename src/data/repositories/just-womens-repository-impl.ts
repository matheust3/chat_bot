import { JustWomensRepository } from '../../domain/repositories/just-womens-repository'
import { Contact, GroupChat, Message } from 'whatsapp-web.js'
import { AwaitingConfirmationData } from '../../domain/models/awaiting-confirmation-data'

export class JustWomensRepositoryImpl implements JustWomensRepository {
  private readonly _toApproveVotes: number
  private readonly _toBanVotes: number
  readonly awaitingConfirmation = new Map<string, number>()
  readonly awaitingApprove = new Map<string, AwaitingConfirmationData>()

  constructor (toApproveVotes: number, toBanVotes: number) {
    this._toApproveVotes = toApproveVotes
    this._toBanVotes = toApproveVotes
  }

  async onEnjoy (contact: Contact, chatGroup: GroupChat): Promise<void> {
    await chatGroup.sendMessage('Mensagem do Bot:\nOi, seja bem vinda!\nEnvie sua foto com seu nome e idade na legenda\nSerá banida se nao enviar',
      {
        mentions: [contact]
      })
    this.awaitingConfirmation.set(contact.id._serialized, Date.now() + 60000)
  }

  async onMessage (message: Message, chatGroup: GroupChat): Promise<void> {
    const contact = await message.getContact()
    const isAdmin = chatGroup.participants.find(p => p.id._serialized === contact.id._serialized).isAdmin
    // Se aguarda confirmação de identidade
    if (this.awaitingConfirmation.has(contact.id._serialized)) {
      // Se for a foto com o nome e a idade
      if (message.hasMedia && message.body.length > 3) {
        await message.reply('Confirmada, aguardando aprovação')
        this.awaitingConfirmation.delete(contact.id._serialized)
        this.awaitingApprove.set(contact.id._serialized, {
          approveVotes: 0,
          banVotes: 0,
          timeToExpire: Date.now() + 60000 * 24 * 7
        })
      } else {
        await message.reply('Identidade ainda não verificada - Envie sua foto com nome e idade na legenda')
      }
    }
    // Se aguarda aprovação
    if (this.awaitingApprove.has(contact.id._serialized)) {
      const approveData = this.awaitingApprove.get(contact.id._serialized)
      await message.reply(`Ainda não foi aprovada, votos:\nAprovar: ${approveData.approveVotes}/${this._toApproveVotes}\nBan: ${approveData.banVotes}/${this._toBanVotes}`)
    }
    // Se for para aprovar ou banir  alguém
    if ((message.body.startsWith('#up') || message.body.startsWith('#ban')) && message.hasQuotedMsg && !this.awaitingApprove.has(contact.id._serialized)) {
      const quotedMsg = await message.getQuotedMessage()
      const quotedMsgContact = await quotedMsg.getContact()
      // Se eh um usuário que deve ser aprovado ou banido
      if (this.awaitingApprove.has(quotedMsgContact.id._serialized)) {
        const approveData = this.awaitingApprove.get(quotedMsgContact.id._serialized)
        // Se foi aprovado
        if (message.body.startsWith('#up') && (isAdmin || approveData.approveVotes + 1 === this._toApproveVotes)) {
          await quotedMsg.reply('Aprovada')
          this.awaitingApprove.delete(quotedMsgContact.id._serialized)
        } else if (message.body.startsWith('#up')) {
          approveData.approveVotes += 1
          this.awaitingApprove.set(quotedMsgContact.id._serialized, approveData)
        }
        // Se foi banido
        if (message.body.startsWith('#ban') && (isAdmin || approveData.banVotes + 1 === this._toBanVotes)) {
          await quotedMsg.reply('Banida por votos')
          await chatGroup.removeParticipants([quotedMsgContact.id._serialized])
          this.awaitingApprove.delete(quotedMsgContact.id._serialized)
        } else if (message.body.startsWith('#ban')) {
          approveData.banVotes += 1
          this.awaitingApprove.set(quotedMsgContact.id._serialized, approveData)
        }
      }
    }
    const dateNow = Date.now()
    // Remove do grupo se a identidade nao foi verificada
    this.awaitingConfirmation.forEach((value, key) => {
      if (value < dateNow) {
        chatGroup.sendMessage('Sua identidade não foi verificada :/').then(
          (m) => {
            chatGroup.removeParticipants([key]).then((e) => {
              this.awaitingConfirmation.delete(key)
            }).catch(e => console.error(e))
          }
        ).catch(e => console.error(e))
      }
    })
    // Aprova se deu o tempo limite da votação
    this.awaitingApprove.forEach((value, key) => {
      if (value.timeToExpire < dateNow) {
        this.awaitingApprove.delete(key)
      }
    })
  }
}
