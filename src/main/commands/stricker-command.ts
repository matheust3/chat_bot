import { IClient } from '../protocols/IClient'
import { IMessage } from '../protocols/IMessage'
import { IMessageType } from '../protocols/IMessageType'
import { StickerRepositoryImpl } from '../../data/repositories/sticker-repository-impl'
import { CreateStaticStickerDatasourceImpl } from '../../infra/create-static-sticker-datasource-impl'
import { CheckDataTypeDatasourceImpl } from '../../infra/check-data-type-datasource-impl'
import { CreateAnimatedStickerDatasourceImpl } from '../../infra/create-animated-sticker-datasource-impl'
import { Sticker } from '../../domain/models/sticker'

const createStaticStickerDatasource = new CreateStaticStickerDatasourceImpl()
const stickerRepository = new StickerRepositoryImpl(
  createStaticStickerDatasource,
  new CheckDataTypeDatasourceImpl(),
  new CreateAnimatedStickerDatasourceImpl()
)

export default async (message: IMessage, client: IClient): Promise<void> => {
  if (message.command?.command === 'sticker') {
    let mediaMsgId = ''
    if (message.type === IMessageType.IMAGE || message.type === IMessageType.VIDEO) {
      mediaMsgId = message.id
    } else if (message.quotedMsg !== undefined && (message.quotedMsg.type === IMessageType.IMAGE || message.quotedMsg.type === IMessageType.VIDEO)) {
      mediaMsgId = message.quotedMsg.id
    } else {
      await client.sendText(message.groupId ?? message.from, 'Você precisa enviar uma imagem ou vídeo para transformar em sticker', { quotedMsg: message.id })
      return
    }

    const mediaBuffer = await client.downloadFile(mediaMsgId)
    let sticker: Sticker
    try {
      sticker = await stickerRepository.createSticker(mediaBuffer.toString('base64'), !(message.command?.args?.includes('o') ?? true))
    } catch (e) {
      console.error(e)
      await client.sendText(message.groupId ?? message.from, 'Encontrei um erro ao criar a figurinha', { quotedMsg: message.id })
      return
    }
    try {
      await client.sendImageAsSticker(message.groupId ?? message.from, sticker.path, sticker.type, { quotedMsg: message.id })
    } catch (e) {
      console.error(e)
      let msg = 'Encontrei um erro ao enviar a figurinha'
      if (e.message === 'ERROR_TOO_LARGE') {
        msg = 'A figurinha é muito grande para ser enviada'
      }
      await client.sendText(message.groupId ?? message.from, msg, { quotedMsg: message.id })
    }
  }
}
