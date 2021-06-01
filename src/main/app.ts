import { Client } from 'whatsapp-web.js'
import { StickerRepositoryImpl } from '../data/repositories/sticker-repository-impl'
import { CheckDataTypeDatasourceImpl } from '../infra/check-data-type-datasource-impl'
import { CreateStaticStickerDatasourceImpl } from '../infra/create-static-sticker-datasource-impl'
import { CreateAnimatedStickerDatasourceImpl } from '../infra/create-animated-sticker-datasource-impl'
import { ChatBot } from '../presentation/chat-bot'
import { promisify } from 'util'
import child_process from 'child_process'
import fs from 'fs'
import qrCode from 'qrcode-terminal'
import { ChatRepositoryImpl } from '../data/repositories/chat-repository-impl'

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

//= ====================================================
//                 Inicia o Bot
//= ====================================================

const SESSION_FILE_PATH = `${__dirname}/../../tokens/session.json`
let sessionCfg

if (fs.existsSync(SESSION_FILE_PATH)) {
  sessionCfg = JSON.parse(fs.readFileSync(SESSION_FILE_PATH).toString('ascii'))
}
//! datasources
//! repositories
const chatRepository = new ChatRepositoryImpl()
const client = new Client({ puppeteer: { headless: true, args: ['--no-sandbox'] }, session: sessionCfg })
const chatBot = new ChatBot(client, stickerRepository, chatRepository)
// Print o qrcode no console
client.on('qr', (qr) => {
  qrCode.generate(qr, { small: true })
})
// Quando a sessão eh autenticada
client.on('authenticated', (session) => {
  console.log('AUTHENTICATED', session)
  sessionCfg = session
  fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
    if (err !== null) {
      console.error(err)
    }
  })
})
// Quando ha falha na sessão
client.on('auth_failure', msg => {
  // Fired if session restore was unsuccessfully
  console.error('AUTHENTICATION FAILURE', msg)
})
// Quando esta pronto
client.on('ready', () => {
  client.getWWebVersion().then(version => console.log('READY - WhatApp Web version:', version)).catch(e => console.error('Erro ao pegar a versão -> ', e))
})

// Quando recebe qualquer mensagem
client.on('message_create', msg => {
  chatBot.onAnyMessage(msg).catch((error) => console.error('Erro na função onAnyMessage => ', error))
})

//
// Inicia o bot
//

client.initialize().then((_) => {
  console.log('Iniciado')
}).catch((error) => console.error('Erro ao iniciar o cliente', error))
