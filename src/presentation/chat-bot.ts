/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Whatsapp } from 'venom-bot'
import { WhatsMessage } from '../domain/models/whats-message'
import { StickerRepository } from '../domain/repositories/sticker-repository'

export class ChatBot {
  private readonly _client: Whatsapp
  private readonly _stickerRepository: StickerRepository

  constructor (client: Whatsapp, stickerRepository: StickerRepository) {
    this._client = client
    this._stickerRepository = stickerRepository
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async onAnyMessage (message: any): Promise<void> {
    if (message.caption !== undefined && message.caption !== null) {
      message.caption = message.caption.toLowerCase()
    }
    if ((message.caption !== undefined && message.caption === '#sticker') || (message.body !== undefined && message.body === '#sticker' && message.quotedMsgObj !== null)) {
      const msg: WhatsMessage = message
      if (msg.isGroupMsg || msg.sender.isMyContact) {
        if (message.body === '#sticker') {
          if (message.quotedMsg.type === 'video' || message.quotedMsg.type === 'image') {
            await this.createSticker(message.quotedMsgObj)
          } else {
            await this._client.reply(message.chatId, '😔 Eu não consigo fazer uma figurinha disso 😔', message.id.toString())
          }
        } else {
          await this.createSticker(message)
        }
      } else {
        await this._client.sendText(msg.chatId, '=> Esta é uma mensagem do bot <=\n\nMeu criador só autoriza seus contatos a fazerem figurinhas no privado, mas você ainda pode me usar nos grupos em que meu criador participa\n\nAqui esta um desses grupos:\nhttps://chat.whatsapp.com/BSs7Gj45KcUA014nWw8bBb')
      }
    }
  }

  async createSticker (message: WhatsMessage): Promise<void> {
    try {
      const result = await this._stickerRepository.createSticker((await this._client.decryptFile(message)).toString('base64'))
      const msg: WhatsMessage = message
      if (result?.valid) {
        if (result.type === 'animated') {
          await this._client.sendImageAsStickerGif(msg.chatId, result.path)
        } else {
          await this._client.sendImageAsSticker(msg.chatId, result.path)
        }
      } else {
        await this._client.sendText(msg.chatId, '😣 Não foi possível criar sua figurinha 😭')
      }
    } catch (err) {
      if ((err.message as string).includes('missing critical data needed to download the file')) {
        await this._client.sendText(message.chatId, 'Nao consegui baixar a imagem pra fazer a figurinha 😪😪')
        await this._client.sendText(message.chatId, 'Manda de novo! 🥺🥺')
      } else {
        await this._client.sendText(message.chatId, 'Nao consegui fazer sua figurinha 😓😓')
        console.error(err)
      }
    }
  }
}
