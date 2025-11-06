import 'dotenv/config'
import 'dotenv/config'
import { create, Message } from '@wppconnect-team/wppconnect'
import path from 'path'
import { promisify } from 'util'
import child_process from 'child_process'
import fs from 'fs'
import { messageAdapter } from './adapters/messageAdapter'
import commands from './config/commands'
import middlewares from './config/middlewares'
import { clientAdapter } from './adapters/clientAdapter'

interface IOriginQuotedMsg {
  id: {
    _serialized: string
  }
  body: string
  from: string
  type: string
}

type ExtendedMessage = Message & { fromMe?: boolean, caption?: string, quotedMsg?: IOriginQuotedMsg, quotedParticipant: string }

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

create({
  session: 'stickerBot',
  folderNameToken: path.join(__dirname, '/../../database-files/tokens'),
  debug: false,
  headless: true,
  browserArgs: ['--no-sandbox']
}).then(async (client) => {
  // Recebe a mensagem e envia a resposta
  client.onAnyMessage((message: Message) => {
    void (async () => {
      const msg = await messageAdapter(message as ExtendedMessage, client)
      const cli = clientAdapter(client)

      let next = true
      const nextFunction = (): void => {
        next = true
      }
      // Executa os middlewares
      const loadedMiddlewares = await middlewares()
      for (const middleware of loadedMiddlewares) {
        if (!next) break
        next = false
        await middleware(msg, cli, nextFunction)
      }
      // Bloqueia a execução dos comandos se o middleware retornar false
      if (!next) return

      if (msg.isCommand) {
        const loadedCommands = await commands()
        for (const command of loadedCommands) {
          await command(msg, cli)
        }
      }
    })()
  })
}).catch((error) => console.error('Erro ao criar o cliente', error))
