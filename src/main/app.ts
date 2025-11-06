import 'dotenv/config';
import { create, Message } from '@wppconnect-team/wppconnect'
import path from 'path'
import { promisify } from 'util'
import child_process from 'child_process'
import fs from 'fs'
import { messageAdapter } from './adapters/messageAdapter'
import commands from './config/commands'
import middlewares from './config/middlewares'
import { clientAdapter } from './adapters/clientAdapter'
import { ChatsDatasourceImpl } from '../infra/chats-datasource-impl'
import { Database } from 'sqlite3'

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
}).then((client) => {
  // Recebe a mensagem e envia a resposta
  client.onAnyMessage((message) => {
    const msg = messageAdapter(message)
    const cli = clientAdapter(client)

              let next = true
              const nextFunction = (): void => {
                next = true
              }
              // Executa os middlewares
              for (const middleware of middlewares) {
                if (!next) break
                next = false
                await middleware(msg, cli, nextFunction)
              }
              // Bloqueia a execução dos comandos se o middleware retornar false
              if (!next) return

              if (msg.isCommand) {
                for (const command of commands) {
                  await command(msg, cli)
                }
              }
            })().catch((error) => console.error('Erro ao processar a mensagem', error))
          })
        }).catch((error) => console.error('Erro ao criar o cliente', error))
      }).catch((error) => console.error('Erro ao carregar os comandos', error))
    }).catch((error) => console.error('Erro ao carregar os middlewares', error))
  }).catch((error) => console.error('Erro ao criar as tabelas no datasource', error))
}).catch((error) => console.error('Erro ao liberar a conexão com o banco de dados', error))
