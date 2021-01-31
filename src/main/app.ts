import { create } from 'venom-bot'
import { StickerRepositoryImpl } from '../data/repositories/sticker-repository-impl'
import { CheckDataTypeDatasourceImpl } from '../infra/check-data-type-datasource-impl'
import { CreateStaticStickerDatasourceImpl } from '../infra/create-static-sticker-datasource-impl'
import { ChatBot } from '../presentation/chat-bot'

const createStaticStickerDatasource = new CreateStaticStickerDatasourceImpl()
const checkDataTypeDatasource = new CheckDataTypeDatasourceImpl()
const stickerRepository = new StickerRepositoryImpl(createStaticStickerDatasource, checkDataTypeDatasource)

create('chat-bot').then((client) => {
  const chatBot = new ChatBot(client, stickerRepository)
  client.onAnyMessage((message) => {
    chatBot.onAnyMessage(message).catch((error) => {
      console.error('Error na função onAnyMessage da classe ChatBot --> ', error)
    })
  }).catch((error) => {
    console.error('Erro em onAnyMessage --> ', error)
  })
})
  .catch((erro) => {
    console.log(erro)
  })
