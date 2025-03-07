import { IClient } from '../protocols/IClient'
import { IMessage } from '../protocols/IMessage'

export default async (message: IMessage, client: IClient): Promise<void> => {
  if (message.fromMe) {
    if (message.command?.command === 'delete') {
      // Verifica se tem uma mensagem quoted
      if (message.quotedMsg === undefined) {
        await client.sendText(message.from, 'Esse comando só pode ser usado em mensagens com uma mensagem quoted', { quotedMsg: message.id })
      } else {
        // Envia a mensagem id
        await client.deleteMessage(message.chatId, message.quotedMsg.id)
      }
    }
  }
}
