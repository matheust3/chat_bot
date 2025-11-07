import { IClient } from '../protocols/IClient'
import { IMessage } from '../protocols/IMessage'

export default async (message: IMessage, client: IClient): Promise<void> => {
  if (message.fromAdmin) {
    if (message.command?.command === 'debug') {
      if (message.command.args?.length === 0 || message.command.args === undefined) {
        await client.sendText(message.groupId ?? message.from, 'É necessário fornecer um argumento para o comanda', { quotedMsg: message.id })
      } else {
        if (message.command.args?.includes('message')) {
          console.log('Debugging message: ', message)
        } else if (message.command.args?.includes('bot_admin')) {
          const isAdmin = await client.botIsAdmin(message.groupId ?? message.from)
          await client.sendText(message.groupId ?? message.from, `O bot é admin do grupo? ${isAdmin ? 'Sim' : 'Não'}`, { quotedMsg: message.id })
        } else {
          await client.sendText(message.groupId ?? message.from, 'Argumento inválido para o comando debug', { quotedMsg: message.id })
        }
      }
    }
  }
}
