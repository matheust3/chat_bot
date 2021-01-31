import { Message, Whatsapp } from 'venom-bot'
import { WhatsMessage } from '../domain/models/whats-message'
import { StickerRepository } from '../domain/repositories/sticker-repository'

export class ChatBot {
  private readonly _client: Whatsapp
  private readonly _stickerRepository: StickerRepository

  constructor (client: Whatsapp, stickerRepository: StickerRepository) {
    this._client = client
    this._stickerRepository = stickerRepository
  }

  async onAnyMessage (message: any): Promise<void> {
    console.log(message)
    if (message.caption !== undefined && message.caption !== null) {
      message.caption = message.caption.toLowerCase()
    }
    if (message.caption !== undefined && message.caption === '#sticker') {
      const result = await this._stickerRepository.createSticker(message.body)
      if (result?.valid) {
        if (result.type === 'animated') {
          await this._client.sendImageAsStickerGif(message.from, result.data)
        } else {
          await this._client.sendImageAsSticker(message.from, result.data)
        }
      } else {
        await this._client.sendText(message.from, '😣 Não foi possível criar sua figurinha 😭')
      }
    }
  }
}
