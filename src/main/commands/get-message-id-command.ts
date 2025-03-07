import { IClient } from '../protocols/IClient'
import { IMessage } from '../protocols/IMessage'

export default async (message: IMessage, client: IClient): Promise<void> => {
  if (message.fromMe) {
    if (message.command?.command === 'get_message_id') {
      // Verifica se tem uma mensagem quoted
      if (message.quotedMsg === undefined) {
        await client.sendText(message.from, 'Esse comando só pode ser usado em mensagens com uma mensagem quoted', { quotedMsg: message.id })
      } else {
        // Envia a mensagem id
        await client.sendText(message.groupId ?? message.from, `O id da mensagem é: ${message.quotedMsg.id}`, { quotedMsg: message.quotedMsg.id })
      }
    }
  }
}
