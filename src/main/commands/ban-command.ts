import { IClient } from '../protocols/IClient'
import { IMessage } from '../protocols/IMessage'

export default async (message: IMessage, client: IClient): Promise<void> => {
  if (message.fromAdmin) {
    if (message.command?.command === 'ban') {
      if (message.groupId === undefined) {
        await client.sendText(message.from, 'Esse comando só pode ser usado em grupos', { quotedMsg: message.id })
      } else {
        const quotedMsgId = message.quotedMsg?.id
        if (quotedMsgId === undefined) {
          await client.sendText(message.groupId, 'Você precisa responder a mensagem de quem deseja banir', { quotedMsg: message.id })
        } else {
          if (message.quotedMsg?.from === undefined) {
            await client.sendText(message.groupId, 'Não foi possível identificar o usuário', { quotedMsg: quotedMsgId })
          } else {
            await client.sendText(message.groupId, 'Você foi banido por esse motivo', { quotedMsg: quotedMsgId })
            await new Promise(resolve => setTimeout(resolve, 2000))
            await client.ban(message.groupId, message.quotedMsg.from)
          }
        }
      }
    }
  }
}
