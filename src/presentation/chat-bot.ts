/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Chat, Client as Whatsapp, Message, MessageMedia } from 'whatsapp-web.js'
import { Sticker } from '../domain/models/sticker'
import { StickerRepository } from '../domain/repositories/sticker-repository'
export class ChatBot {
  private readonly _client: Whatsapp
  private readonly _stickerRepository: StickerRepository

  constructor (client: Whatsapp, stickerRepository: StickerRepository) {
    this._client = client
    this._stickerRepository = stickerRepository
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async onAnyMessage (message: Message): Promise<void> {
    message.body = message.body.toLowerCase()
    const chat = await message.getChat()
    if ((message.hasMedia && message.body === '#sticker') || (message.body !== undefined && message.body === '#sticker' && message.hasQuotedMsg)) {
      const contact = await message.getContact()
      if (chat.isGroup || message.fromMe || contact.isMyContact) {
        if (message.body === '#sticker' && message.hasQuotedMsg) {
          const quotedMsg = await message.getQuotedMessage()
          if (quotedMsg.hasMedia) {
            await this.createSticker(message, true, chat)
          } else {
            await quotedMsg.reply('😔 Eu não consigo fazer uma figurinha disso 😔')
          }
        } else {
          await this.createSticker(message, false, chat)
        }
      } else {
        await this._client.sendMessage(chat.id._serialized, '=> Esta é uma mensagem do bot <=\n\nMeu criador só autoriza seus contatos a fazerem figurinhas no privado, mas você ainda pode me usar nos grupos em que meu criador participa\n\nAqui esta um desses grupos:\nhttps://chat.whatsapp.com/BSs7Gj45KcUA014nWw8bBb')
      }
    }
  }

  async createSticker (message: Message, isQuoted: boolean, chat: Chat): Promise<void> {
    const mediaMessage = isQuoted ? (await message.getQuotedMessage()) : message
    let msgMedia: MessageMedia
    try {
      msgMedia = await mediaMessage.downloadMedia()
    } catch (e) {
      await mediaMessage.reply('Nao consegui baixar a imagem pra fazer a figurinha 😪😪')
      console.error(e)
      return
    }
    if (msgMedia.mimetype.includes('video') || msgMedia.mimetype.includes('image')) {
      let result: Sticker
      try {
        result = await this._stickerRepository.createSticker(msgMedia.data)
      } catch (e) {
        await message.reply('👾 Não consegui converter o arquivo para um sticker 👾 - Fale com meu criador se você continuar recebendo essa mensagem')
        console.error(e)
        return
      }
      if (result?.valid) {
        const media = MessageMedia.fromFilePath(result.path)
        try {
          await this._client.sendMessage(chat.id._serialized, null, { media: media, sendMediaAsSticker: true })
        } catch (err) {
          await message.reply('Nao consegui enviar sua figurinha 😓 - Tente diminuir o tamanho do arquivo (em MB)')
          console.error(err)
        }
      } else {
        await message.reply('Não foi possível criar sua figurinha 😣 - Talvez o formato do arquivo não é suportado')
      }
    } else {
      await message.reply('Eu não consigo fazer uma figurinha disso 😔')
    }
  }
}
