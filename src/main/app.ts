import { create } from 'venom-bot'
import { StickerRepositoryImpl } from '../data/repositories/sticker-repository-impl'
import { CheckDataTypeDatasourceImpl } from '../infra/check-data-type-datasource-impl'
import { CreateStaticStickerDatasourceImpl } from '../infra/create-static-sticker-datasource-impl'
import { CreateAnimatedStickerDatasourceImpl } from '../infra/create-animated-sticker-datasource-impl'
import { ChatBot } from '../presentation/chat-bot'
import { promisify } from 'util'
import child_process from 'child_process'
import fs from 'fs'

const createStaticStickerDatasource = new CreateStaticStickerDatasourceImpl()
const createAnimatedStickerDatasource = new CreateAnimatedStickerDatasourceImpl()
const checkDataTypeDatasource = new CheckDataTypeDatasourceImpl()
const stickerRepository = new StickerRepositoryImpl(createStaticStickerDatasource, checkDataTypeDatasource, createAnimatedStickerDatasource)

// Apaga os arquivos da pasta 'cache' com mais de um dia
setInterval(() => {
  /* istanbul ignore else */
  if (fs.existsSync(`${__dirname}/../cache`)) {
    const exec = promisify(child_process.exec)
    exec(`find ${__dirname}/../cache -type f -mtime +1 -delete`).then(() => {
      console.log('Cache limpo!')
    }).catch((err) => {
      console.log('Erro ao limpar a pasta cache ', err)
    })
  }
}, 900000)

create('chat-bot', null, null, { browserArgs: ['--no-sandbox'] }).then((client) => {
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
