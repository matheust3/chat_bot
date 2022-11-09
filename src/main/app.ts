import child_process from 'child_process'
import fs from 'fs'
import LokiJs from 'lokijs'
import path from 'path'
import qrCode from 'qrcode-terminal'
import { promisify } from 'util'
import { Client } from 'whatsapp-web.js'
import { AntiSpamRepositoryImpl } from '../data/repositories/anti-spam-repository-impl'
import { BanRepositoryImpl } from '../data/repositories/ban-repository-impl'
import { ChatRepositoryImpl } from '../data/repositories/chat-repository-impl'
import { DatabaseRepositoryImpl } from '../data/repositories/database-repository-impl'
import { GhostRepositoryImpl } from '../data/repositories/ghost-repository-impl'
import { StickerRepositoryImpl } from '../data/repositories/sticker-repository-impl'
import { CheckDataTypeDatasourceImpl } from '../infra/check-data-type-datasource-impl'
import { CreateAnimatedStickerDatasourceImpl } from '../infra/create-animated-sticker-datasource-impl'
import { CreateStaticStickerDatasourceImpl } from '../infra/create-static-sticker-datasource-impl'
import { AddChatToAuthorizedChatsFileDatasource } from '../infra/database/add-chat-to-authorized-chats-file-datasource'
import { LoadAuthorizedChatsFileDatasource } from '../infra/database/load-authorized-chats-file-datasource'
import { LoadGhostDataFileDatasource } from '../infra/load-ghost-data-file-datasource'
import { LokiAntiFloodDatasource } from '../infra/loki-anti-flood-datasource'
import { LokiBanLogsDatasource } from '../infra/loki-ban-logs-datasource'
import { SaveGhostDataFileDatasource } from '../infra/save-ghost-data-file-datasource'
import { ChatBot } from '../presentation/chat-bot'

const createStaticStickerDatasource = new CreateStaticStickerDatasourceImpl()
const createAnimatedStickerDatasource = new CreateAnimatedStickerDatasourceImpl()
const checkDataTypeDatasource = new CheckDataTypeDatasourceImpl()
const stickerRepository = new StickerRepositoryImpl(createStaticStickerDatasource, checkDataTypeDatasource, createAnimatedStickerDatasource)

// Apaga os arquivos da pasta 'cache' com mais de um dia
setInterval(() => {
  /* istanbul ignore else */
  if (fs.existsSync(path.join(__dirname, '/../cache'))) {
    const exec = promisify(child_process.exec)
    exec(`find ${path.join(__dirname, '/../cache')} -type f -mtime +1 -delete`).then(() => {
      console.log('Cache limpo!')
    }).catch((err) => {
      console.log('Erro ao limpar a pasta cache ', err)
    })
  }
}, 900000)

//= ====================================================
//                 Inicia o Bot
//= ====================================================

//! infra
const lokiDb = new LokiJs(path.join(__dirname, '/../../database-files/loki_db.db'), {
  env: 'NODEJS',
  autosave: true,
  autosaveInterval: 1000,
  autoload: true
})
const antiFloodDb = new LokiJs('', { persistenceMethod: 'memory' }) // in memory
//! datasources
const saveGhostDataFileDatasource = new SaveGhostDataFileDatasource()
const loadGhostDataFileDatasource = new LoadGhostDataFileDatasource()
const loadAuthorizedChatsFileDatasource = new LoadAuthorizedChatsFileDatasource()
const addChatToAuthorizedChatsFileDatasource = new AddChatToAuthorizedChatsFileDatasource()
const banLogsDatasource = new LokiBanLogsDatasource(lokiDb)
const antiFloodDatasource = new LokiAntiFloodDatasource(antiFloodDb, 30)
//! repositories
const databaseRepository = new DatabaseRepositoryImpl(
  loadAuthorizedChatsFileDatasource,
  addChatToAuthorizedChatsFileDatasource

)
const banRepository = new BanRepositoryImpl(banLogsDatasource)
const ghostRepository = new GhostRepositoryImpl(loadGhostDataFileDatasource, saveGhostDataFileDatasource)
const chatRepository = new ChatRepositoryImpl()
const antiSpamRepository = new AntiSpamRepositoryImpl(antiFloodDatasource)

const client = new Client({ puppeteer: { headless: true, args: ['--no-sandbox'] } })
const chatBot = new ChatBot(client, stickerRepository, databaseRepository, chatRepository, ghostRepository, antiSpamRepository, banRepository)
// Print o qrcode no console
client.on('qr', (qr) => {
  qrCode.generate(qr, { small: true })
})
// Quando a sessão eh autenticada
client.on('authenticated', () => {
  console.log('AUTHENTICATED')
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
