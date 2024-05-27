import { create } from '@wppconnect-team/wppconnect'
import path from 'path'
import { promisify } from 'util'
import child_process from 'child_process'
import fs from 'fs'
import { messageAdapter } from './adapters/messageAdapter'
import commands from './config/commands'
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

create({
  session: 'stickerBot',
  folderNameToken: path.join(__dirname, '/../../database-files/tokens'),
  debug: false
}).then((client) => {
  // Recebe a mensagem e envia a resposta
  client.onAnyMessage((message) => {
    const msg = messageAdapter(message)
    const cli = clientAdapter(client)

    if (msg.isCommand) {
      commands().then((commands) => {
        commands.forEach((command) => {
          command(msg, cli).catch((error) => console.error('Erro ao executar o comando', error))
        })
      }).catch((error) => console.error('Erro ao carregar os comandos', error))
    }
  })
}).catch((error) => console.error('Erro ao criar o cliente', error))
