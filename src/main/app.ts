import { create } from '@wppconnect-team/wppconnect'
import path from 'path'
import { promisify } from 'util'
import child_process from 'child_process'
import fs from 'fs'
import { messageAdapter } from './adapters/messageAdapter'
import commands from './config/commands'
import middlewares from './config/middlewares'
import { clientAdapter } from './adapters/clientAdapter'

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

// Carrega os middlewares e os comandos
middlewares().then((middlewares) => {
  console.log('Middlewares carregados')
  commands().then((commands) => {
    console.log('Comandos carregados')
    create({
      session: 'stickerBot',
      folderNameToken: path.join(__dirname, '/../../database-files/tokens'),
      debug: false,
      browserArgs: ['--no-sandbox'],
      whatsappVersion: '2.3000.1019760984-alpha'
    }).then((client) => {
      // Recebe a mensagem e envia a resposta
      client.onAnyMessage((message) => {
        const msg = messageAdapter(message)
        const cli = clientAdapter(client)

        let next = true
        const nextFunction = (): void => {
          next = true
        }
        if (!next) return
        next = false
        middlewares.forEach((middleware) => {
          middleware(msg, cli, nextFunction).catch((error) => console.error('Erro ao executar o middleware', error))
        })

        // Bloqueia a execução dos comandos se o middleware retornar false
        if (!next) return

        if (msg.isCommand) {
          commands.forEach((command) => {
            command(msg, cli).catch((error) => console.error('Erro ao executar o comando', error))
          })
        }
      })
    }).catch((error) => console.error('Erro ao criar o cliente', error))
  }).catch((error) => console.error('Erro ao carregar os comandos', error))
}).catch((error) => console.error('Erro ao carregar os middlewares', error))
