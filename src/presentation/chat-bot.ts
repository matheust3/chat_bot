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
    if (message.caption !== undefined && message.caption === '#sticker') {
      const result = await this._stickerRepository.createSticker((await this._client.decryptFile(message)).toString('base64'))
      const msg: WhatsMessage = message
      if (result?.valid) {
        if (result.type === 'animated') {
          await this._client.sendImageAsStickerGif(msg.chatId, result.path)
        } else {
          await this._client.sendImageAsSticker(msg.chatId, result.path)
        }
      } else {
        await this._client.sendText(message.from, '😣 Não foi possível criar sua figurinha 😭')
      }
    }
  }
}
