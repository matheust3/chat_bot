import { IClient } from '../protocols/IClient'
import { IMessage } from '../protocols/IMessage'

export default async (message: IMessage, client: IClient): Promise<void> => {
  if (message.fromMe) {
    if (message.command?.command === 'group_info') {
      if (message.groupId === undefined) {
        await client.sendText(message.from, 'Esse comando só pode ser usado em grupos', { quotedMsg: message.id })
      } else {
        if (message.command.args?.includes('id') === true) {
          const groupId = message.groupId
          await client.sendText(message.groupId ?? message.from, groupId, { quotedMsg: message.id })
        }
      }
    }
  }
}
