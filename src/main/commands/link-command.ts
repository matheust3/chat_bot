import { IClient } from '../protocols/IClient'
import { IMessage } from '../protocols/IMessage'

export default async (message: IMessage, client: IClient): Promise<void> => {
  if (message.command?.command === 'link') {
    if (message.groupId === undefined) {
      await client.sendText(message.from, 'Esse comando só pode ser usado em grupos', { quotedMsg: message.id })
    } else {
      const link = await client.getGroupInviteLink(message.groupId)
      await client.sendText(message.groupId ?? message.from, link, { quotedMsg: message.id })
    }
  }
}
