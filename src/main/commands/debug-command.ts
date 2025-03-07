import { IClient } from '../protocols/IClient'
import { IMessage } from '../protocols/IMessage'

export default async (message: IMessage, client: IClient): Promise<void> => {
  if (message.fromMe) {
    if (message.command?.command === 'debug') {
      if (message.command.args?.length === 0 || message.command.args === undefined) {
        await client.sendText(message.groupId ?? message.from, 'É necessário fornecer um argumento para o comanda', { quotedMsg: message.id })
      } else {
        if (message.command.args?.includes('message')) {
          console.log('Debugging message: ', message)
        }
      }
    }
  }
}
