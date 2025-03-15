import { IClient } from '../protocols/IClient'
import { IMessage } from '../protocols/IMessage'

export default async (message: IMessage, client: IClient): Promise<void> => {
  if (message.fromAdmin) {
    if (message.command?.command === 'delete') {
      // Verifica se tem uma mensagem quoted
      if (message.quotedMsgId === undefined) {
        await client.sendText(message.from, 'Esse comando só pode ser usado respondendo uma mensagem', { quotedMsg: message.id })
      } else {
        // Envia a mensagem id
        await client.deleteMessage(message.chatId, message.quotedMsgId)
      }
    }
  }
}
